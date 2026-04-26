# Agent-Outreach Campaign — Progress

Live state of the `outreach-agents/` campaign. Update this file when state
changes meaningfully — it's the snapshot a future Claude Code session
needs to pick up where the last one left off, without re-deriving context.

> Distinct from `OUTREACH.md` (the playbook — pitch, template, hard rules)
> and `README.md` (the quickstart). Don't restate them here; record state.

---

## Current state — 2026-04-25

**Pre-send research is complete; nothing has been emailed yet.**

- `contacts.csv` — 273 priority-ranked contacts across 89 companies (up to
  5 per company; founder/CEO at p1 for early-stage, product/AI/partnerships
  lead at p1 for Series B+ and large companies).
- `batch.csv` — 89 rows, one priority-1 contact per company. **Generated
  from `contacts.csv` priority=1 rows** — never hand-edit; regenerate by
  re-running the aggregation if `contacts.csv` changes.
- `outreach-log.csv` — empty (header only). Populated by `send-batch.py`
  on first run.

Coverage by category:

| Category | Companies |
|---|---|
| consumer-shopping | 29 |
| saas-procurement | 12 |
| agent-infra | 12 |
| brand-side | 10 |
| b2b-procurement | 10 |
| agent-payments | 9 |
| procurement-orchestration | 7 |

Contacts per company:

| Contacts | Companies |
|---|---|
| 5 | 11 |
| 4 | 14 |
| 3 | 38 |
| 2 | 22 |
| 1 | 4 |

26 companies have <3 contacts — for very small/bootstrapped startups
(Browserless solo, Onton ~5-person, Aesthetic/Alta/Raspberry AI early-
stage) the public surface area genuinely doesn't have 5 senior people.
Don't fabricate.

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
- **5-contacts coverage.** 26 companies under-researched (<3 contacts).
  Decision still pending: spawn another research round, or accept the
  current ceiling.
- **Tidio and AgenticTrust have no `name`** in `batch.csv` — the sender
  will use `Hi,` for these (no per-recipient greeting). Confirm before
  sending.
- **Tidio re-research** — consider giving Tidio a real first-name
  contact via a follow-up Haiku pass; the brand-side run did surface
  Marcin Stoll (CPO) but the row in `batch.csv` may have been left blank
  during a prior Tidio update.

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
