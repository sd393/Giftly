# Channel3 beauty shopping agent

A small CLI agent that takes a natural-language beauty request, searches Channel3, ranks results against your profile, and prints a buy-ready checkout URL.

Honest caveat: Channel3 does not place orders. The agent hands you a URL on the merchant's site; clicking it through Channel3's affiliate network attributes commission automatically.

## Setup

```bash
cd components/test/experiments/channel3
pnpm install
cp .env.example .env
# fill CHANNEL3_API_KEY and OPENAI_API_KEY in .env
```

Get a Channel3 key (self-serve) at https://trychannel3.com/sign-up; it shows up on the [dashboard](https://trychannel3.com/dashboard/api) immediately. Free tier: 1000 credits/month, then $0.007/call.

Customize your profile (optional):

```bash
cp profile.json profile.local.json
# edit profile.local.json — it's gitignored
```

## Run

Two front-ends share the same Channel3 client.

### A. Web UI (search any product)

```bash
pnpm dev          # boots Next.js on http://localhost:3030
```

Open http://localhost:3030, type a query, get a grid of results. Each card links straight to the merchant — Channel3 attributes commission automatically.

The UI calls `POST /api/search`, which proxies to Channel3's `products.search()` (no LLM, no profile). The UI itself does not need an `OPENAI_API_KEY`; only `CHANNEL3_API_KEY`.

### B. CLI agent (profile-aware single pick)

```bash
pnpm agent "fragrance-free moisturizer for combination skin under $35"
pnpm agent "lightweight vitamin C serum" --open   # also launches the browser
```

Output is a single JSON object on stdout; OpenAI token usage logs to stderr each iteration. This path runs the full LLM tool loop and applies your `profile.json` constraints.

## Tests

```bash
pnpm test         # ranker + buildSearchBody unit tests
pnpm typecheck    # tsc --noEmit
```

No live integration tests by default (each search costs 1 Channel3 credit + OpenAI tokens).

## Files

- `app/page.tsx` — search UI (client component).
- `app/api/search/route.ts` — POST endpoint that proxies to Channel3.
- `app/layout.tsx`, `app/globals.css` — Next.js shell + Tailwind v4.
- `src/agent.ts` — CLI entry, profile loading.
- `src/llm.ts` — OpenAI tool-calling loop, two tools.
- `src/channel3.ts` — Channel3 SDK wrapper, filter mapping (shared by UI and CLI).
- `src/ranker.ts` — deterministic profile-fit re-scoring (CLI only).
- `src/types.ts` — zod profile schema, output shape.
- `PLAN.md` — design rationale and self-critique.

### Why `--webpack` instead of Turbopack

Turbopack's project-root detection walks up the directory tree looking for a lockfile; because this experiment sits inside the parent Giftly Next.js app, Turbopack mis-identifies the root and tries to compile the parent's `proxy.ts` as well. Pinning the scripts to webpack avoids that. Turbopack works fine when the experiment is moved to a sibling of the Next.js root.

## Known limitations

- Ingredient matching is substring-based against title and description; not a real INCI-list parse.
- Brand block/allow lists match by name substring on the SDK's first-returned brand only.
- The agent runs at most 5 LLM iterations; complex requests may need a higher cap.
- Channel3 catalog data is not persisted between runs (per their data-use policy).
