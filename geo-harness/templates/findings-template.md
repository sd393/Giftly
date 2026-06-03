# GEO Audit — {{BRAND}}

Date: {{DATE}}  |  Domain: {{DOMAIN}}  |  Auditor: {{NAME}}

## Ground truth (fill BEFORE running geo-prompts)
Record the *current* live facts; every AI answer is scored against this.

| Fact | Current value |
|------|---------------|
| Membership price | |
| Member discount (current) | |
| Member discount (legacy/deprecated, if any) | |
| Free-shipping threshold(s) | |
| Returns policy | |
| Founded / founder | |
| Hero product price | |
| Trustpilot / BBB | |

---

## Headline findings (front-load the most damning, TRACEABLE ones)
> A finding only counts if you can name the source the AI pulled it from.

1.
2.
3.

---

## Layer 1 — Crawlability
- Bot access (`geo-out/bot-access.txt`):
- Indexability traps (`geo-out/indexability.txt`):  *(deprecated pages still indexed?)*

## Layer 2 — Structured data
- Agentic surfaces / llms.txt type (`geo-out/agentic-recon.txt`):
- UCP/MCP gating (`geo-out/mcp-probe.txt`):
- PDP JSON-LD gaps (`geo-out/schema-audit.txt`):
- Product .json + member-price invisibility (`geo-out/product-json-*.txt`):

## Layer 3 — Entity & authority
- Wikipedia / Wikidata (`geo-out/entity-check.txt`):  *(entity? name collision?)*
- SERP / knowledge panel (`geo-out/serp.txt`):  *(entity panel vs merchant panel; concept pollution)*

## Layer 4 — Reputation / consequence
- Reddit (`geo-out/reddit-threads.txt`):  *(dominant subreddits, top threads, verbatim phrases)*
- Trust aggregates (Trustpilot / BBB):
- Listicle presence (be honest about parity):

## ChatGPT prompt set (`geo-out/prompts-*.txt`)
Per category, summarize and quote verbatim. **The Pass 1 vs Pass 2 diff is the headline slide.**

| id | prompt | Pass 1 (memory) | Pass 2 (web) | diff | source cited |
|----|--------|-----------------|--------------|------|--------------|

### Hallucinations / staleness (vs ground truth)
-

---

## Two-axis positioning vs competitors
| Axis | Sub-axis | {{BRAND}} vs peers |
|------|----------|--------------------|
| Transactional | UCP/MCP infra | |
| Content | structured schema | |
| Content | llms.txt depth | |
| Content | unstructured (listicles/YouTube) | |
| Entity | knowledge graph | |
| Reputation | trust aggregates | |
| Reputation | Reddit sentiment | |

## Remediations (pair each gap with its cost)
| Finding | Fix | Effort |
|---------|-----|--------|
