# Plan — Beauty shopping agent on the Channel3 API

Author: Claude (drafted 2026-05-19) · Status: scaffolded, awaiting `pnpm install` + key

---

## 0. What we're actually building — and what "order" means here

A CLI agent that takes a natural-language beauty request (e.g. *"fragrance-free moisturizer for combination skin under $35"*), searches Channel3, re-ranks results against my profile, and prints a buy-ready checkout URL.

**Honest caveat up front:** Channel3 does **not** place orders. Their FAQ is explicit: *"Channel3 provides search and recommendations only — it does not handle transactions."* What it does have is a built-in affiliate model — every `ProductOffer.url` returned by `/v1/search` is already commission-tracked through Channel3's network. Clicking through attributes the sale automatically. So "order" means:

1. Understand what I want.
2. Find the best product.
3. Hand me a commission-tracked checkout URL.

Fully automated checkout (Shopify storefront, Playwright flows) is intentionally out of scope.

---

## 1. Differences from the Catalog plan in `components/test/experiments/catalog/`

This experiment uses the **same shape** as the Catalog plan but takes advantage of three Channel3-specific wins:

| Concern | Catalog plan | Channel3 implementation |
|---|---|---|
| API key | Gated — email `founders@getcatalog.ai` | **Self-serve** at trychannel3.com/sign-up |
| Client layer | Hand-rolled `fetch` + retry | **Official SDK** `@channel3/sdk` (handles auth, errors, pagination) |
| Affiliate step | Separate `POST /v2/affiliate` call after search | **Built into `ProductOffer.url`** — no extra call |
| Async polling | Required (`extract` is async) | **All endpoints synchronous** (search, lookup, similar) |
| Hard filters | Client-side only | Pushed into `filters` (price, availability) |
| Pricing | Email for details | **1000 free credits/month**, then $0.007/call; /brands /websites /products /categories are free |

Net result: the code is smaller. No retry layer, no polling helper, no separate affiliate wrapper.

---

## 2. File layout

```
components/test/experiments/channel3/
├── PLAN.md                ← this file
├── README.md              ← how to run
├── package.json           ← experiment-local deps (isolated from root)
├── tsconfig.json          ← Bundler resolution, ES2022, Node types
├── vitest.config.ts       ← scoped to tests/**/*.test.ts
├── .env.example
├── .gitignore             ← .env, profile.local.json, node_modules
├── profile.json           ← committed defaults
├── src/
│   ├── agent.ts           ← CLI entry; loads profile, runs agent, prints JSON
│   ├── channel3.ts        ← @channel3/sdk wrapper + filter mapping
│   ├── ranker.ts          ← deterministic profile-fit scoring
│   ├── llm.ts             ← OpenAI tool-calling loop (2 tools)
│   └── types.ts           ← zod schemas (Profile, ChosenProduct)
└── tests/
    ├── ranker.test.ts     ← 7 unit tests on the ranker
    └── channel3.test.ts   ← buildSearchBody contract
```

A one-line edit was made to the root `tsconfig.json` to add `"components/test/experiments"` to `exclude` — otherwise the root `tsc --noEmit` would try to typecheck our Node code against the Next.js DOM-targeted config and fail.

---

## 3. Architecture

```
CLI input string ──► agent.ts
                       │
                       ▼
              ┌─────────────────┐
              │ OpenAI w/ tools │  ◄── profile (system prompt)
              └────────┬────────┘
                       │  tool: search_products(query, max_results)
                       ▼
              channel3.searchProducts()  ──► client.products.search()
                       │                       (filters pushed into API:
                       │                        price ceiling, in_stock)
                       │
                       ▼
              ranker.rank()  ◄── soft scoring against profile
                       │            (hard ingredient/brand blocks too)
                       │
                       │  tool: lookup_product(url) — optional, when user pastes a URL
                       ▼
              channel3.lookupByUrl()  ──► client.products.lookup()
                       │
                       ▼
        LLM emits final JSON: {chosen_product, checkout_url, reason, alternatives}
                       │
                       ▼
        agent.ts prints JSON; `--open` flag launches the URL in default browser.
```

---

## 4. Key decisions, each with rationale

### 4.1 SDK over raw fetch

The official `@channel3/sdk@3.2.0` provides typed methods, error classes, pagination helpers, locale defaults, and `CHANNEL3_API_KEY` env-var pickup. Hand-rolling fetch would lose type safety on `SearchFilters`, `ProductDetail`, and `ProductOffer` — all of which we touch directly.

### 4.2 Push every constraint we can into the API

Channel3's `filters` accepts `price.max_price` and `availability: ['InStock']`. Both are pushed in `buildSearchBody()`. Two reasons:

1. Saves credits on results we'd discard anyway.
2. The mini API returns only 30 max — pre-filtering means more *usable* results in our window.

What we **can't** push: ingredient avoid lists (not a documented filter), brand blocklist by *name* (the SDK takes brand IDs; resolving names would cost an extra `/v1/brands/search` per entry). Those stay in the ranker.

### 4.3 No separate affiliate call

Unlike Catalog (where you call `/v2/affiliate` after search), Channel3 monetizes the URL Channel3 already gave you. `ProductOffer.url` is the checkout URL — clicking it through Channel3's network attributes commission. So we delete the `make_checkout_url` tool the Catalog plan needed.

### 4.4 Two tools, not three

- `search_products({query, max_results})` — wraps `client.products.search` + ranker.
- `lookup_product({url})` — for when the user pastes a URL directly. Free endpoint per pricing docs.

We don't expose `find_similar` for the v0 — keeps the LLM loop short. Easy to add when needed.

### 4.5 Deterministic ranker for the things the API can't enforce

The ranker handles three things the API doesn't:

| Rule | Effect |
|---|---|
| `avoid_ingredients` substring in title/description | drop (−∞ score) |
| brand name matches `brand_blocklist` substring | drop |
| `required_ingredients` substring | +10 each |
| brand matches `brand_allowlist` substring | +5 |
| price over ceiling (despite API filter, in case it slips through) | −((over)/ceiling × 20) |
| `commission_rate` | +rate × 2 (tiebreak only) |

Every score adjustment is recorded in `reasons[]` for explainability. The LLM sees these scores and reasons when picking the final winner.

### 4.6 Why the LLM picks the winner, not the ranker

The ranker enforces *hard constraints* and gives *coarse signals*. Picking among the top three almost-equivalent items requires the LLM's read of the user's natural-language phrasing ("for a humid climate", "for my partner"). So we sort by score, give the LLM the full list, and let it choose.

### 4.7 OpenAI model default: `gpt-4o-mini`

Cheap, fast, good enough at tool-routing. Overridable via `OPENAI_MODEL` env var.

### 4.8 Max 5 iterations

Hard cap on the tool-calling loop. The two tools mean the realistic path is: `search → final` (2 turns) or `search → search → final` (3 turns). Five gives breathing room without runaway cost.

---

## 5. Self-critique

In line with my standing instruction to never trust the first draft:

1. **Substring ingredient matching is sloppy.** "Alcohol denat" in marketing copy ≠ in the formula. **Mitigation:** documented in README; Phase 2 could call `products.retrieve()` to access `materials[]`/`key_features[]` for structured matching.

2. **Brand block lookups match the first brand only.** `ProductDetail.brands` is an array; we only check `brands[0]`. Multi-brand products (collab SKUs) could slip through. **Mitigation:** in practice rare for beauty; would change to a `.some()` if it bites.

3. **No retry on transient SDK errors.** Channel3's `APIError` will throw on 5xx. **Mitigation:** the SDK already does some internal retries (Stainless default). For a single-user CLI, additional retry logic is premature.

4. **The agent assumes English.** Profile has `country`/`currency` but no `language`. **Mitigation:** Add to profile schema when needed; SDK already accepts `language` per locale config.

5. **No `--dry-run` mode.** Every invocation costs ≥1 Channel3 credit + ~2-5k OpenAI tokens. **Mitigation:** trivial follow-up; would replace `searchProducts` with a fixture.

6. **The final-output JSON is parsed naively.** If the LLM emits prose around the JSON, parsing fails. **Mitigation:** the system prompt is explicit ("no prose, no code fences"), and we strip code fences as a fallback. Could add a zod-validated retry on parse failure.

7. **The `as never` casts on locale config.** Because Channel3's TS types use literal-string unions for country/currency and the profile uses plain `string`, we cast to `never` (TS's "trust me" escape) at the SDK boundary. Safe-ish — bad values just cause an SDK 422 with a clear error.

8. **No test for the LLM loop.** Hard to test without mocking the entire OpenAI SDK. **Mitigation:** would only catch typos, not behavior; manual smoke runs are the right verification layer here.

---

## 6. Open questions to answer before live-running

1. **Channel3 key** — go to https://trychannel3.com/sign-up; key shows on the dashboard immediately.
2. **OpenAI key** — needs `OPENAI_API_KEY` in `.env`.
3. **Profile content** — defaults in `profile.json` are sensible (combination skin, fragrance-free, $60 ceiling). Override by copying to `profile.local.json`.

---

## 7. Phase-2 ideas

- **Image search.** SDK has `client.products.searchByImage({image_url})`. A `--image <url>` flag on the CLI would route to it.
- **Similar products.** `client.products.findSimilar({product_id})` for refining a near-miss.
- **Price tracking.** Channel3 has price-history and subscription endpoints. The agent could subscribe to a product for drop alerts.
- **MCP mode.** Channel3 publishes an MCP server (`https://mcp.trychannel3.com/?apiKey=…`). Inside Claude Code we could skip the OpenAI tool layer entirely and let the harness handle it. Keeps the CLI for portability.
- **Multi-merchant comparison.** When `offers[]` has multiple entries, the agent could surface the price gap and commission tradeoff side-by-side.
