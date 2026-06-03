# GEO Audit Methodology

How to run a Generative Engine Optimization audit and read the results. This is the "why"
behind the scripts in `bin/`. Read this before presenting findings.

---

## The core idea

AI answer engines (ChatGPT, Perplexity, Gemini, Copilot) and AI shopping agents answer
questions about a brand from a small set of sources:

1. **The brand's own pages** — whatever is crawlable / indexed (HTML, JSON-LD, `.json`, `llms.txt`).
2. **Third-party reputation** — Reddit, Trustpilot, BBB, listicles, YouTube transcripts.
3. **A knowledge-graph entity** — Wikipedia / Wikidata, if one exists.
4. **Live retrieval at answer time** — what the engine fetches *right now* when web search is on.

A GEO audit measures all four and then **verifies the consequence**: ask a real AI engine the
questions a customer would ask, and trace each answer back to its source. A finding only earns
a deck slide once you can say *"ChatGPT says X — here's the exact page/thread it came from."*

---

## The four layers (and what "bad" looks like)

### Layer 1 — Crawlability (`geo-bot-access`, `geo-indexability`)
Can AI crawlers reach the content?
- **Probe:** request key URLs with the four major AI-crawler user-agents (GPTBot, ClaudeBot,
  PerplexityBot, OAI-SearchBot). Look for non-200 status, `cf-mitigated`, `x-robots-tag`,
  `retry-after`, or a bot/browser byte-size mismatch (cloaking).
- **Bad:** AI bots get 403/429 while browsers get 200 (blocking), or main content is JS-gated
  so non-rendering crawlers see an empty shell.
- **Subtle trap:** the *opposite* problem. A deprecated/embarrassing page that is fully
  crawlable **and actively indexed** (no `noindex`, self-canonical, in the sitemap) will be
  ingested and quoted. `geo-indexability` exists to catch exactly this — run it on any legacy,
  superseded, or "we changed this policy" page.

### Layer 2 — Structured data (`geo-agentic-recon`, `geo-mcp-probe`, `geo-schema-audit`, `geo-product-json`)
Is the catalog machine-readable enough for an agent to cite prices and transact?
- **`geo-agentic-recon`** inventories the agentic surfaces: `llms.txt`, `llms-full.txt`,
  `agents.md`, `/.well-known/ucp`, sitemaps, `robots.txt`. Note whether `llms.txt` is a
  **protocol template** (how to transact, zero catalog — common Shopify default) or a
  **content map** (what to find, with descriptions — what AI search engines actually consume).
- **`geo-mcp-probe`** checks whether a UCP/MCP endpoint exists and whether it's **gated**.
  Many Shopify stores expose `/api/ucp/mcp` but reject anonymous callers (the caller must host
  a signed, cache-compliant UCP agent profile). If gated, agents fall back to scraping — so
  the whole protocol investment is invisible to today's ChatGPT.
- **`geo-schema-audit`** extracts a PDP's JSON-LD and flags gaps: missing `sku`, a single flat
  `offer` instead of per-variant offers, `mpn` that's actually a Shopify product ID (not a
  GTIN), missing `FAQPage`/`Review`/`priceSpecification` schema.
- **`geo-product-json`** checks the open `/products/{handle}.json` (rich: real SKUs, barcodes,
  live inventory) **and** whether member/loyalty pricing is exposed in *any* machine-readable
  field. A common failure: the member price is rendered client-side only, so it appears in no
  crawlable field — the membership's core value is the one number an AI can't retrieve.

### Layer 3 — Entity & authority (`geo-entity-check`, `geo-serp`)
Is there an authoritative entity for AI to anchor to?
- **`geo-entity-check`** searches Wikipedia + Wikidata for the brand and competitors.
- **Bad:** no Wikipedia article and no Wikidata entity — the engine has nothing authoritative
  to ground "the brand" against. **Worse:** the brand name collides with a common concept
  (e.g. "Public Goods" the company vs. "public goods" the economics term), so the entity slot
  is occupied by the wrong thing.
- **`geo-serp`** (headed browser) captures the branded SERP: is there a *knowledge-graph
  entity panel* (founder/HQ/founded) or only a *merchant/shopping panel* (delivery/returns,
  zero facts)? How much of the top-10 is the brand vs. a colliding concept or negative threads?

### Layer 4 — Reputation / consequence (`geo-reddit`, `geo-serp`, `geo-prompts`)
What do the quotable sources actually say, and what does the AI repeat?
- **`geo-reddit`** pulls upvotes + top comments for threads (discover thread URLs first via
  `geo-serp` or a `site:reddit.com` search). High-upvote threads are the ones most likely to be
  in training data. Tag the dominant subreddits — they tell you the audience that shapes the corpus.
- **`geo-prompts`** is the keystone: a fixed prompt set run through a real logged-in ChatGPT
  session, **twice** per prompt (see below), capturing the verbatim answer + citations + a screenshot.

---

## The Pass 1 vs Pass 2 method (the headline technique)

Run every prompt in two modes and diff them:

- **Pass 1 — no browsing** (force it: *"Without searching the web or browsing, based only on
  what you already know, answer: …"*). This surfaces what the model **remembers** from training
  data: years of Reddit, old articles, cached reputation. The "scam/fraud/cash-grab" language
  lives here.
- **Pass 2 — web search on** (force it: *"Search the web for current information, then answer: …"*).
  This surfaces what **live retrieval** pulls: the brand's own current pages, BBB, Trustpilot.
  Deprecated-but-indexed pages (the Layer-1 trap) surface here.

> **Why the prefix matters:** current ChatGPT auto-routes to web search even on plain prompts,
> so leaving the toggle off is not enough. Force each mode with the prompt prefix.

**The diff is itself the deliverable.** "What ChatGPT *thinks* about the brand" vs. "what
ChatGPT *says* after reading the brand's own site + BBB + Reddit." In a healthy brand these
agree. When they diverge — Pass 2 surfaces a 40%-off offer the brand discontinued, or an "F"
BBB rating, or omits the brand from a category ranking it belongs in — each divergence is a
traceable slide.

---

## The ground-truth table

Before running `geo-prompts`, write down the *actual* current facts (price, discount, shipping
thresholds, founding, ratings) from the live site. Then score every AI answer against it. Any
deviation is logged as a hallucination/staleness finding. Typical pattern: the AI carries a
**historical** number (an old price, a discontinued discount) because that figure dominates the
training corpus and the deprecated page is still indexed. Fill in
`templates/findings-template.md` → "Ground truth" before you start.

---

## Anti-bot reality (read before the browser probes)

Hard lessons, baked into the harness:

- **Headless browsers get blocked** on the sources that matter most: Google ("unusual
  traffic"), DuckDuckGo (duck CAPTCHA), Trustpilot (Cloudflare "Verifying Connection"), Reddit
  search (empty). Plain `curl` gets blocked too.
- **Use headed mode.** gstack `browse --headed` launches a real (visible) Chromium with stealth
  and clears Google + Trustpilot where headless cannot. On Linux it auto-spawns Xvfb if there's
  no display.
- **Reddit:** the search API returns a generic feed (useless), but **per-thread `.json`**
  (`https://www.reddit.com/<thread-path>.json`) works fine via `curl`. So: discover thread URLs
  via a headed Google `site:reddit.com` search, then pull each thread's JSON. Parse with
  `json.loads(raw, strict=False)` — bodies contain control characters that break strict mode.
- **ChatGPT login without retyping credentials:** the harness can reuse an existing **Firefox**
  ChatGPT session. Firefox stores cookies unencrypted in `cookies.sqlite`; export the
  `chatgpt.com`-domain cookies (the split `__Secure-next-auth.session-token.0/.1` + `cf_clearance`)
  to Playwright JSON and import into headed Chromium. Import **only** `chatgpt.com` cookies
  (mixing in `.openai.com` cookies aborts on a domain mismatch) and give every cookie a valid
  positive integer `expires`. Verify login by **screenshot**, not a DOM heuristic — ChatGPT
  shows the composer to logged-out users too, so "composer present" is a false positive.
  (Chromium-family browsers can use `browse cookie-import-browser` directly; Firefox needs the
  sqlite export path above.)
- **SPA capture loop:** for each prompt — `goto` a fresh chat, click the composer, `type`,
  `press Enter`, then **poll** for streaming completion (stop-button gone + an assistant message
  present, stable across two checks) before extracting. Screenshot every response; the
  screenshot is ground truth if text extraction ever misfires.
- **Don't touch the window** while a headed run drives itself, or you'll disrupt the automation.

---

## Reporting discipline

- Front-load the most damning, **traceable** findings. A finding without a source citation is a
  hypothesis, not a finding.
- Report parity honestly. If the brand is *at parity* on something you expected it to be behind
  on (e.g. listicle inclusion, YouTube volume), say so — it sharpens the real gaps and keeps the
  deck credible.
- Separate **passive** from **active**. "Crawlable" is passive; "indexed (self-canonical + in
  sitemap)" is an active choice with a one-line fix. The active framing is stronger.
- Note every AI hallucination/staleness against the ground-truth table, so you're not
  overstating the AI's accuracy or the brand's exposure.
- Pair each problem with its remediation cost. Most structured-data gaps are Shopify-Liquid
  template edits or a `noindex` line — cheap, which makes the deck actionable.

Use `templates/findings-template.md` as the report skeleton.
