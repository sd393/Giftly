# Plan — Beauty shopping agent on the Catalog API

Author: Claude (drafted 2026-05-19) · Status: draft, awaiting user sign-off

---

## 0. What we're actually building — and what "order" means here

A small CLI agent that takes a natural-language beauty request (e.g. *"fragrance-free moisturizer for combination skin under $35"*), searches Catalog, ranks results against my saved profile, and produces a one-click affiliate checkout URL.

**Honest constraint up front:** the Catalog API does **not** place orders. Its `/v2/affiliate` endpoint generates a Wildfire-tracked URL — clicking it lands you on the merchant's product page (Sephora, Ulta, brand DTC, etc.) ready to check out. There is no programmatic "submit cart" capability that works across merchants. The agent's job is therefore:

1. Understand what I want.
2. Find the best-matching product.
3. Hand me a buy-ready URL (or open it in the default browser).

Fully automated checkout (Shopify storefront API, headless-browser Playwright flows, etc.) is intentionally **out of scope** for this experiment — we want to validate the discovery → ranking → handoff loop first.

---

## 1. Repo location & file layout

Everything lives under `components/test/experiments/catalog/`:

```
components/test/experiments/catalog/
├── PLAN.md                  ← this file
├── README.md                ← how to run
├── package.json             ← experiment-local deps (don't pollute root)
├── tsconfig.json
├── .env.example
├── .gitignore               ← .env, profile.local.json, node_modules
├── profile.json             ← committed defaults
├── profile.local.json       ← personal copy (gitignored)
├── src/
│   ├── agent.ts             ← agent loop entry point (CLI)
│   ├── catalog/
│   │   ├── client.ts        ← typed Catalog API client (auth, retry)
│   │   ├── search.ts        ← /v2/agentic-search-mini wrapper
│   │   ├── extract.ts       ← /v2/extract + polling helper
│   │   └── affiliate.ts     ← /v2/affiliate wrapper
│   ├── llm/
│   │   ├── openai.ts        ← OpenAI tool-calling glue
│   │   └── tools.ts         ← tool definitions exposed to the LLM
│   ├── ranker.ts            ← deterministic profile-fit scoring
│   ├── types.ts             ← zod schemas (profile, product, request)
│   └── util/
│       ├── retry.ts         ← exponential backoff for 429/5xx
│       └── logger.ts
└── tests/
    ├── ranker.test.ts
    ├── client.test.ts       ← vitest with fetch mock
    └── fixtures/
        └── search-response.json
```

**Why a local `package.json`?** The root app is Next.js + Tailwind + Supabase. Adding `tsx` and pinning experiment-only deps at the root pollutes the production dep tree. Keeping the experiment self-contained means we can delete the folder cleanly when done.

---

## 2. High-level data flow

```
CLI input string ──► agent.ts
                       │
                       ▼
              ┌─────────────────┐
              │ OpenAI w/ tools │  ◄── beauty profile (system prompt)
              └────────┬────────┘
                       │  tool: search_products(query, max_results)
                       ▼
              catalog/search.ts  ──► POST /v2/agentic-search-mini
                       │
                       │  (optional) tool: enrich_product(url)
                       ▼
              catalog/extract.ts ──► POST /v2/extract + poll
                       │
                       │  ranker.ts re-scores against profile
                       ▼
                       │  tool: make_checkout_url(url)
                       ▼
              catalog/affiliate.ts ──► POST /v2/affiliate
                       │
                       ▼
          Print product card + checkout URL; `--open` to launch browser.
```

---

## 3. Key decisions, each with rationale

### 3.1 `agentic-search-mini` over `agentic-search`

The async `/v2/agentic-search` supports a structured `customer_profile`, but you have to poll `GET /v2/agentic-search/{execution_id}` until it completes. The mini variant is synchronous, capped at 10 results, with a simpler body `{query, enable_enrichment}`.

For a "simple" agent we want **synchronous tool calls** — the LLM loop reads cleaner without polling inside tool handlers. The price is that mini doesn't accept `customer_profile`, so personalization is moved client-side:

- The user profile renders into the LLM **system prompt**.
- The LLM rewrites the natural-language request into a profile-aware query before calling `search_products`.
- After results return, `ranker.ts` re-scores against the profile deterministically.

If the experiment shows personalization is weak through that channel, Phase 2 graduates to `/v2/agentic-search`.

### 3.2 OpenAI tool-calling, not a hand-rolled state machine

The repo already has `openai@6`. Using its tool-calling API lets the LLM decide whether to refine the query, call `extract` for richer attributes on a candidate, or jump straight to affiliate. Three tools, no more:

| Tool | Wraps | Returns |
|---|---|---|
| `search_products({query, max_results})` | `/v2/agentic-search-mini` | Scored & ranked product list |
| `enrich_product({url})` | `/v2/extract` + polling | Full attributes/reviews for one URL |
| `make_checkout_url({url})` | `/v2/affiliate` | Wildfire URL, or original on failure |

We deliberately do **not** expose a "place order" tool — there is no such endpoint, and inventing one would be a lie to the model and the user.

### 3.3 Deterministic ranker, not LLM-based scoring

LLM-based scoring on 10 items hides *why* an item won. A small deterministic ranker over profile fields (price band, avoid list, must-haves, brand allow/block) is easier to debug, easier to unit-test, and encodes the *hard* constraints (`avoid_ingredients`) that the LLM can't be trusted to enforce. The LLM still does the **final pick** — but it sees scored, sorted, reason-tagged inputs.

### 3.4 Wildfire fallback

Docs warn: *"Not all product URLs may be supported by the Wildfire network."* The affiliate response has a per-item `success` boolean. If `success: false`, the agent falls back to the raw product URL and surfaces "no affiliate tracking available" in the output.

### 3.5 Rate-limit + retry policy

Limits are 50 requests / 4-second sliding window — generous for one user, but the retry layer handles failures defensively:

- 429: respect `Retry-After` header; if missing, exponential 1s/2s/4s.
- 402 (`INSUFFICIENT_CREDITS`): do **not** retry — surface clearly to the user.
- 5xx: exponential backoff, capped at 4 attempts.
- 4xx other than 429: fail fast — these mean a client bug.

---

## 4. Profile shape

```ts
// src/types.ts
export const Profile = z.object({
  skin_type: z.enum(["oily", "dry", "combination", "normal", "sensitive"]).optional(),
  hair_type: z.string().optional(),
  avoid_ingredients: z.array(z.string()).default([]),        // ["fragrance", "alcohol denat"]
  required_ingredients: z.array(z.string()).default([]),     // ["niacinamide"]
  brand_allowlist: z.array(z.string()).default([]),
  brand_blocklist: z.array(z.string()).default([]),
  price_ceiling_usd: z.number().positive().optional(),
  category_preferences: z.record(z.string(), z.number()).default({}),  // {"skincare": 1, "fragrance": -1}
  notes: z.string().optional(),                              // free-form, dumped into system prompt
});
```

Starter `profile.json` is committed with safe defaults. The user copies to `profile.local.json` for personal data (gitignored).

---

## 5. Implementation steps in order

Each step calls out what's being done **and** why, since the work spans Catalog's API, OpenAI tool-calling, retry semantics, and zod validation.

### Step 1 — Scaffolding (~15 min)

Create the folder, `package.json` with deps:
- `openai` (LLM tool calling)
- `zod` (runtime validation)
- `tsx` (run TS directly, no build step)
- `dotenv` (env loading)
- `vitest`, `@types/node` (dev)

`tsconfig.json` targeting `nodenext` modules. `.env.example` with `CATALOG_API_KEY=` and `OPENAI_API_KEY=`. `.gitignore` for `.env`, `profile.local.json`, `node_modules/`.

### Step 2 — Typed Catalog client (~45 min)

`src/catalog/client.ts` — a thin `fetch` wrapper that:
- Injects `x-api-key` and `Content-Type: application/json`.
- Parses JSON and **zod-validates every response** (Catalog's response shape may drift; we want loud failures, not silent `undefined`s).
- Throws typed errors mapped from the documented error-code table (`UNAUTHORIZED`, `INSUFFICIENT_CREDITS`, `RATE_LIMITED`, etc.).

`src/util/retry.ts` — wraps any request fn with the retry policy from §3.5.

Endpoint wrappers (`search.ts`, `extract.ts`, `affiliate.ts`) — narrow surface, one function each, fully typed.

### Step 3 — Ranker (~30 min)

`src/ranker.ts` — pure function `(products[], profile) => ScoredProduct[]`.

Scoring rules (additive, transparent, every adjustment recorded in `reasons: string[]`):
- **−∞** if title/description contains any `avoid_ingredients` substring (case-insensitive).
- **+10** per `required_ingredients` match.
- **−5** if brand in blocklist, **+5** if in allowlist.
- **−((price − ceiling) / ceiling × 20)** if over ceiling (soft penalty, not a hard cut — a $42 product when ceiling is $40 stays in but ranks lower).

### Step 4 — LLM tool layer (~45 min)

`src/llm/tools.ts` — OpenAI tool schemas matching the three tool functions.

`src/llm/openai.ts` — tool-calling loop with **max 5 iterations** and a hard system prompt that:
- Names the user's profile fields verbatim.
- Explicitly tells the model what it cannot do (place orders; ask more than two clarifying questions).
- Demands a final JSON output: `{chosen_product, checkout_url, reason, alternatives}`.

Loop exits when the model returns a message with no tool calls.

### Step 5 — CLI entry (~20 min)

`src/agent.ts`:
- Parses argv for the request string (or reads stdin).
- Loads `profile.local.json` if present, else `profile.json`.
- Runs the agent.
- Prints the chosen product card + URL.
- `--open` flag uses `child_process.exec("open <url>")` on darwin.

### Step 6 — Tests (~30 min)

- `tests/ranker.test.ts`: edge cases — empty profile, all products blocked by avoid list, missing ingredients field, price equal to ceiling, price 50% over ceiling.
- `tests/client.test.ts`: mock `fetch` with vitest's `vi.stubGlobal`; verify retry on 429 with `Retry-After: 1`, no retry on 400, request body shape.
- **No live integration tests by default** (they cost credits). Provide an opt-in: `INTEGRATION=1 pnpm test`.

### Step 7 — Manual smoke run

```bash
pnpm tsx src/agent.ts "fragrance-free moisturizer for combination skin under $35"
```

Verify a sensible product comes back with a working checkout URL. Repeat with 2–3 other prompts (a serum, a fragrance — fragrance should warn given profile defaults, etc.).

---

## 6. Self-critique (code-reviewer hat on)

Per my standing instruction to never trust the first draft, here is what I'd flag if reviewing this plan cold:

1. **"Simple agent" is doing a lot.** Tool loop + retry + ranker + zod + tests adds up. **Mitigation:** each piece is small (<300 LOC total) and independently swappable. A 200-line single-file script would be harder to iterate on once API quirks emerge.

2. **mini returns only 10 items; the local ranker may be noise.** If Catalog's own ranking is strong, re-scoring 10 items locally is mostly cosmetic. **Mitigation:** the ranker's real job is encoding **hard constraints** the LLM can't be trusted with (`avoid_ingredients`). Worth it even at N=10.

3. **Ingredient matching is substring-based.** "alcohol denat" in a description ≠ in the formula. **Mitigation:** documented as a known limitation; Phase 2 swaps to `/v2/extract` with `enable_enrichment` and parses structured attributes.

4. **No session persistence.** Each run is stateless. **Mitigation:** correct default for an experiment; persistence is Phase 2.

5. **Wildfire vendor coverage is unknown.** If most beauty brands aren't supported, the affiliate angle is worthless. **Mitigation:** raw-URL fallback is non-blocking; treat affiliate as nice-to-have, not a requirement. We learn coverage empirically.

6. **Profile lives in a JSON file.** Can't tweak mid-conversation. **Mitigation:** acceptable for an experiment; `--update-profile` is Phase 2.

7. **`openai@6` already in the root, but we're duplicating it under the experiment folder.** Doubles the install. **Mitigation:** experiment isolation is worth ~30 MB of disk; the version can drift from the root without breaking the main app.

8. **No token-usage logging.** Easy to silently burn OpenAI budget. **Mitigation:** trivial — log token counts from each OpenAI response to stderr. Adding to step 4.

---

## 7. Open questions before implementation

1. **API key.** Do you already have a `CATALOG_API_KEY`, or do you need to email `founders@getcatalog.ai` first?
2. **Profile dimensions.** Are the fields in §4 the right axes for you (skin type, ingredient avoid list, brand allow/block, price ceiling), or do you want richer dimensions (skin-tone hex for foundation matching, current routine slots, undertone, etc.)?
3. **`--open` default.** On by default (faster), or opt-in (safer — no accidental browser launches)?
4. **OpenAI model.** `gpt-4o-mini` for cost, or step up to `gpt-4o` / `gpt-5`?

---

## 8. Phase-2 ideas (not in this plan)

- Swap to `/v2/agentic-search` with a real structured `customer_profile`.
- `/v2/crawl` to pre-index a handful of favorite vendors and constrain searches.
- Playwright-based checkout automation for Shopify/Sephora.
- Local SQLite ledger for purchase history.
- Slack-bot front end instead of CLI.
- Re-rank with embeddings from prior purchases.
