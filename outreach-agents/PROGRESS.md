# Agent-Outreach Campaign — Progress

Live state of the `outreach-agents/` campaign. Update this file when state
changes meaningfully — it's the snapshot a future Claude Code session
needs to pick up where the last one left off, without re-deriving context.

> Distinct from `OUTREACH.md` (the playbook — pitch, template, hard rules)
> and `README.md` (the quickstart). Don't restate them here; record state.

---

## Current state — 2026-04-26

**Pre-send research is complete; nothing has been emailed yet.**

- `contacts.csv` — 304 priority-ranked contacts across 91 companies (up to
  5 per company; founder/CEO at p1 for early-stage, product/AI/partnerships
  lead at p1 for Series B+ and large companies).
- `batch.csv` — 91 rows, one priority-1 contact per company. **Generated
  from `contacts.csv` priority=1 rows** — never hand-edit; regenerate by
  re-running the aggregation if `contacts.csv` changes.
- `outreach-log.csv` — empty (header only). Populated by `send-batch.py`
  on first run.

Coverage by category:

| Category | Companies |
|---|---|
| consumer-shopping | 29 |
| agent-infra | 13 |
| saas-procurement | 12 |
| brand-side | 11 |
| b2b-procurement | 10 |
| agent-payments | 9 |
| procurement-orchestration | 7 |

Contacts per company:

| Contacts | Companies |
|---|---|
| 5 | 14 |
| 4 | 20 |
| 3 | 42 |
| 2 | 13 |
| 1 | 2 |

14 companies still have <3 contacts. After a second research pass
targeted at the 26 originally under-researched companies, these are the
ones where public surface area genuinely doesn't have more senior
people: Browserless (solo-founded), Aesthetic, Doji, Onton, Wildcard,
Raspberry AI (all <10 employees); Evolinq, Magentic, Tacto, Hyperbrowser,
Kernel, PayOS (early seed/stealth, only founders public); Omakase.ai,
Rep AI (small mid-stage). Don't fabricate.

---

## Decisions and overrides

These are non-obvious choices made during research that affect what's in
`contacts.csv` / `batch.csv`. Don't undo without a reason.

- **Style.ai dropped** — verified as a B2B marketing/SEO platform, not a
  consumer shopping agent (the landscape doc's entry was misleading).
- **Henry AI / Henry Labs dropped** — verified candidates were a
  commercial real-estate deal-automation startup, not the consumer
  shopping agent the landscape doc described. Possibly the original is
  defunct; re-verify before re-adding.
- **OneOff dropped** — confirmed shut down March 2026 (~2.5 years in).
- **BrowserAI dropped** — research subagent skipped it; no contacts found.
- **Cherry dropped** — couldn't resolve a canonical domain; multiple
  unrelated companies share the name.
- **Travel-agent slice dropped** — out of scope per user direction.
- **Cacheflow dropped** — acquired by HubSpot Oct 2024.
- **Nudge Security, ProcureDesk, Precoro, LevaData, Acai Travel dropped**
  during the original research pass for being out of scope (security
  posture / no agent layer / B2B-only travel).
- **Foundation-lab equivalents at the merchant/procurement layer skipped**
  (cross-checked against the April 2026 landscape doc on 2026-04-26):
  Salesforce Agentforce, Shopify, BigCommerce, Coupa, Ivalua, Zycus, GEP,
  Flexera, Ramp, Dia (Atlassian-owned), Manus, Rabbit. Same calculus as
  OpenAI/Anthropic — wrong contact level for cold email; needs warm intros.
- **Stagehand** is not a separate company — it's Browserbase's TypeScript
  framework. Already covered.

Added 2026-04-26 after the landscape doc cross-check:

- **Browser Use** | browser-use.com | agent-infra | 2 contacts (Magnus
  Müller, Gregor Žunič — YC W25 founders).
- **commercetools** | commercetools.com | brand-side | 4 contacts (Shiri
  Mosenzon Erez CPO at p1; CEO Doug McNary skipped per "skip CEO at large
  companies").

Manual reranks applied during aggregation (subagent had picked the wrong
contact level despite explicit hints):

- **Glance** — Naveen Ramasamy (VP Product Management) → p1; Naveen
  Tewari (InMobi parent CEO) demoted to p4 per "skip parent corporate".
- **LTK** — Kristi O'Brien (Head of Partnerships) → p1; Baxter Box
  (co-founder/CEO, husband of Amber Venz Box) demoted to p2 per user's
  "skip founder, too senior".
- **Levelpath** — Bryan Rosenstein (Head of Operations) → p1; Yakubovich
  (CEO) → p3 per "$100M raised, skip founder".
- **Zip** — Lu Cheng (CTO co-founder) → p1; Zaparde (CEO) → p3 per
  "Series D $190M, skip founder".
- **Bright Data** — Erez Naveh (VP Product) → p1; Or Lenchner (CEO) →
  p3 per "very large enterprise, skip CEO".
- **Trulioo** — Michael Ramsbacker (CPO) → p1; Vicky Bindra (CEO) → p4
  per "$1.75B unicorn, skip CEO".

Per-company hints baked into the research that the subagent honored
correctly (no rerank needed): Karma → Tamar Shachar (VP Products); Tidio
→ Marcin Stoll (CPO); Vendr → Darius Contractor (CPEO); Tropic → Kristy
McCown (Head of Partnerships); Vertice → Ronny Maate (CPO); Zylo → Ian
Runyon (VP Product); JAGGAER → Gopinath Polavarapu (CDAIO); Constructor
→ Valeriya Bezrukova (VP Product); Capacity → Michael Hunigan (VP Product
AI); Crescendo → Todd Famous (CPO); iAdvize → Benoit Patra (CTO).

Filtered out from the 2026-04-26 second research pass (returned by
subagents but rejected during aggregation):

- **CloudEagle "Petey Cruiser" (COO)** — almost certainly fabricated; the
  name reads as a joke (PT Cruiser). Subagent didn't catch it.
- **Browserless "Alex Boswell" (Director)** — vague title, vague source
  (ZoomInfo only); likely cross-company conflation. Skipped.
- **Airtop Kyle Parrott / Sam Myers (Staff/Senior Engineer)** — IC roles,
  below the senior-leadership threshold the prompt set.
- **Kernel Mason Williams (Founding Engineer)** — IC role at a 5-person
  company.
- **ZenRows Jonathan Nebot (Senior Stealth Engineer)** — IC role.
- **Tidio Monika Dmochowska (Head of Talent Acquisition)** — HR, not
  product/agent-relevant.
- **Omakase.ai Or Perlman re-add** — already in our list at p2; subagent
  re-found him. Took the opportunity to update his role from "Senior
  Engineering Manager" → "Chief Technology Officer" (verified).

---

## Domains worth verifying before send

Subagents differed on a handful of domains; the more recent verification
won out in `batch.csv`. If a scrape comes back fallback-only for any of
these, manually check first:

- Wildcard → `wild-card.ai` (vs `wildcard.ai`)
- Kite → `gokite.ai` (vs `kite.ai`)
- The Prompting Company → `promptingcompany.com` (vs `thepromptingcompany.com`)
- Kernel → `kernel.sh` (vs `kernel.ai`)
- Aesthetic → `myaesthetic.ai` (vs `findgpt.shop`)
- Alta → `alta.ai` (vs `altadaily.com`)
- Swap → `swap.com` (multiple unrelated companies share the name; this
  is the e-commerce-OS Swap by Sam Atkinson)
- Constructor → `constructor.io` (vs `constructor.com`)
- HUMAN Security (AgenticTrust) → `humansecurity.com` (the company name
  is recorded as `HUMAN Security (AgenticTrust)` to capture the product)

---

## Open questions / TODOs

- **Eyeball the curated list.** The user has not yet manually reviewed
  `batch.csv`. Don't kick off `run-batch.sh` until they have.
- **5-contacts coverage.** Down to 14 companies <3 contacts after the
  2026-04-26 follow-up pass. These are bonafide ceilings — solo-founded
  or <10-person startups. Don't try a third pass.

---

## Next step

Once the user has eyeballed `batch.csv` and confirmed:

```bash
GOG_KEYRING_PASSWORD=... ./run-batch.sh batch.csv armaanp4423@gmail.com --dry-run
```

Review the `[scrape]` summary (verified-vs-fallback split) before
removing `--dry-run`. The scrape's biggest failure mode for this
campaign is well-funded tech companies with no public contact email on
their site — those rows will fall back to `hello@{domain}` and the
sender will skip them automatically.
