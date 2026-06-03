# GEO Harness

A general-purpose **Generative Engine Optimization** audit toolkit: point it at any brand's
domain and it measures how that brand shows up to AI crawlers, AI shopping agents, and AI
answer engines (ChatGPT, Perplexity, etc.).

GEO is "SEO for AI engines." Where SEO asks *"will Google rank this page?"*, GEO asks
*"when someone asks ChatGPT about this brand, what does it say — and where did it get that?"*

This harness was distilled from a full audit of a Shopify DTC brand. It separates the audit
into four layers and gives you a script per probe. Most probes are plain `curl`/open-API and
run in seconds; two need a real (headed) browser because search engines and ChatGPT block
headless automation.

---

## The four layers

| Layer | Question | Probes |
|-------|----------|--------|
| **1. Crawlability** | Can AI crawlers reach the pages at all? | `geo-bot-access`, `geo-indexability` |
| **2. Structured data** | Is the catalog machine-readable enough to cite/transact? | `geo-agentic-recon`, `geo-mcp-probe`, `geo-schema-audit`, `geo-product-json` |
| **3. Entity & authority** | Does a knowledge-graph entity exist to anchor the brand? | `geo-entity-check`, `geo-serp` |
| **4. Reputation / consequence** | What do the sources AI engines quote actually say? | `geo-reddit`, `geo-serp`, `geo-prompts` |

The payoff is the **consequence layer**: every finding in layers 1–3 makes a *prediction*
about what an AI engine will say, and `geo-prompts` confirms it empirically by asking a real
ChatGPT session a fixed prompt set and diffing "what it knows" against "what it says after
reading the live site."

See [`METHODOLOGY.md`](./METHODOLOGY.md) for the framework, interpretation guide, and the
hard-won browser/anti-bot lessons.

---

## Quickstart

```bash
cd geo-harness
cp config.example.sh config.sh
$EDITOR config.sh          # set TARGET_DOMAIN, BRAND_NAME, hero product, competitors

# Run every no-auth probe (layers 1–3, ~1 min):
bin/geo-audit.sh

# Outputs land in ./geo-out/ (one .txt per probe) and the combined report is printed.
```

Individual probes:

```bash
bin/geo-bot-access.sh                       # 4 AI-bot UAs × your key URLs
bin/geo-agentic-recon.sh                    # llms.txt / agents.md / .well-known/ucp / sitemaps / robots.txt
bin/geo-mcp-probe.sh                        # UCP/MCP endpoint: is it gated? what tools?
bin/geo-schema-audit.py  <PDP-url>          # PDP JSON-LD fields + gaps (SKU, variants, FAQPage, Review)
bin/geo-product-json.sh  <product-handle>   # /products/{h}.json richness + member-price invisibility
bin/geo-indexability.sh  /pages/some-page   # noindex / X-Robots-Tag / canonical / in-sitemap?
bin/geo-entity-check.sh                     # Wikipedia + Wikidata entity presence (brand + competitors)
bin/geo-reddit.sh        <thread-path>...   # upvotes + top comments for discovered Reddit threads
```

Browser probes (need gstack `/browse` + see METHODOLOGY for the headed/cookies setup):

```bash
bin/geo-serp.sh                             # Google SERP + disambiguation + knowledge-panel capture
bin/geo-prompts.sh                          # the AI-engine prompt-set harness (ChatGPT, 2 passes)
```

---

## What's here

```
geo-harness/
  README.md               # this file
  METHODOLOGY.md          # the framework, interpretation, anti-bot lessons
  config.example.sh       # per-target config (copy to config.sh)
  bin/                    # the probes (one concern each) + geo-audit.sh orchestrator
  lib/
    common.sh             # shared UA strings, helpers, output dir, clipboard
    serp_extract.js       # SERP DOM extractor (used by geo-serp)
    chatgpt_state.js      # ChatGPT streaming-done detector
    chatgpt_resp.js       # ChatGPT answer + citation extractor
  prompts/
    prompt-set.tsv        # 20-prompt template with {{BRAND}} / {{HANDLE}} tokens
  templates/
    findings-template.md  # report skeleton for writing up an audit
```

## Requirements

- `bash`, `curl`, `python3` (stdlib only)
- For browser probes: gstack `/browse` (headed Chromium). Optional: `xclip`/`wl-copy` for clipboard.

No API keys required. Wikipedia, Wikidata, and Reddit are hit via their open endpoints.
