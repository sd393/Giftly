# Giftly Agent Outreach

Cold-email tooling for the shopping-agent API pitch. Sibling of
`outreach/` — fully separate scripts, separate log, no platform mirror.

Pitch and audience live in `OUTREACH.md`. Read that first.

## Setup

Same `gog` auth as the brand campaign — both sender accounts are already
authed if `outreach/` works.

```bash
export GOG_KEYRING_PASSWORD="<your gog keyring password>"
export GOG_ACCOUNT="armaanp4423@gmail.com"   # or armaan.priyadarshan.29@dartmouth.edu
```

To re-auth:

```bash
gog auth add armaanp4423@gmail.com --services gmail --force-consent
```

## Files

| File | Purpose |
| ---- | ------- |
| `OUTREACH.md` | playbook: pitch, target list, template, hard rules, workflow |
| `outreach-log.csv` | canonical log: `name,role,company,domain,category,email,date_sent,verified,notes` |
| `run-batch.sh` | one-shot orchestrator: scrape → send → bounce-sweep |
| `scrape-batch.py` | urllib contact-page scraper; summary-only stdout, detail in `logs/` |
| `send-batch.py` | sender; dedupes against this dir's log; summary-only stdout; **no platform mirror** |
| `process-bounces.py` | finds DSNs, marks bounced rows `BOUNCED`, trashes DSNs |

There is no `giftly_api.py` here on purpose — the agent campaign does not
write to the internal platform. Add it back behind a `--mirror` flag if
that changes.

## One-shot batch

Input is a CSV with at least `company,domain` columns (plus optional
`category`, `notes`).

```bash
./run-batch.sh <batch.csv> <account-email>
# optional: --dry-run
```

Output is ~6–10 lines: one summary per stage.

```
[scrape] found=18 fallback=12 elapsed=42s log=logs/scrape-batch.log
  warn: SomeCo err:URLError
[send]   sent=15 failed=0 skipped_dup=3 log=logs/send-batch.log
[bounce] dsns=1 bounced_emails=1 log_updated=1 trashed=1 log=logs/bounces-2026-04-25.log
```

Per-row detail is in `logs/` if you need to investigate.

## How Claude should drive this

Read `OUTREACH.md` in full first — the research prompt template lives
there. Then:

1. **Research the companies** — `Agent(subagent_type="general-purpose",
   model="haiku", …)` with the prompt from `OUTREACH.md` §1. Returns a
   CSV with `name,role,company,domain,category,notes,in_scope`. Drop
   `in_scope=false` and `domain=UNKNOWN` rows; eyeball the rest. Save
   as `batch.csv`. Do NOT use Opus WebSearch for this.
2. **Run the batch** — `./run-batch.sh <batch.csv> <account>`. Do not
   invoke the individual scripts; the orchestrator already chains them.
3. **Read only the summary.** Investigate `logs/*.log` only if something
   looks off (high fallback count, send failures, unexpected DSN count).

## Hard rules (summary — see OUTREACH.md for full list)

- Only send to `email_source` starting with `https://`. Never to
  `hello@{domain}` fallbacks, never to Hunter or guessed patterns.
- Subject is always exactly `Stanford/Dartmouth Student Inquiry`. Body
  copy lives in `send-batch.py` (`BODY_TMPL`).
- `send-batch.py` dedupes against this directory's `outreach-log.csv`
  (not the brand pipeline's). The two campaigns must never share a log.
- No em dashes, no exclamations, no buzzwords.
