# Giftly Outreach

Cold-email tooling for the Stanford/Dartmouth creator-matching pitch.
Scrapes brand contact pages, sends from authenticated Gmail accounts via the
`gog` CLI, logs results, sweeps bounces.

Built to be cheap in Claude/Opus tokens: one command per batch, summary-only
stdout, per-row detail in `logs/`, brand-to-domain lookup deferred to a Haiku
subagent.

## Setup

```bash
export GOG_KEYRING_PASSWORD="<your gog keyring password>"
# One of:
export GOG_ACCOUNT="armaan.priyadarshan.29@dartmouth.edu"
export GOG_ACCOUNT="armaanp4423@gmail.com"
```

Both accounts should already be authed (`gog auth list`). To re-auth:

```bash
gog auth add armaan.priyadarshan.29@dartmouth.edu --services gmail --force-consent
gog auth add armaanp4423@gmail.com --services gmail --force-consent
```

With multiple accounts stored, every `gog` call needs `--account <email>` —
the scripts pass it through from `GOG_ACCOUNT`.

## Files

| File | Purpose |
| ---- | ------- |
| `OUTREACH.md` | playbook: pitch, email template, full workflow, hard rules |
| `THRONE-CAMPAIGN.md` | retrospective of the 712-send Throne campaign (2026-04-19/20) |
| `outreach-log.csv` | canonical log: `name,role,brand,domain,email,date_sent,verified,llm_evidence` |
| `run-batch.sh` | one-shot orchestrator: scrape → send → bounce-sweep |
| `scrape-batch.py` | urllib contact-page scraper; summary-only stdout, detail in `logs/` |
| `send-batch.py` | sender; dedupes against the log; summary-only stdout |
| `process-bounces.py` | finds DSNs, marks bounced rows `BOUNCED`, trashes DSNs |
| `throne-batch-*.csv` | historical inputs from the Throne campaign |

## One-shot batch

Input is a CSV with at least `brand,domain` columns.

```bash
./run-batch.sh <batch.csv> <account-email>
# optional: --dry-run
```

Output is ~6–10 lines: one summary per stage.

```
[scrape] found=38 fallback=22 elapsed=47s log=logs/scrape-batch.log
  warn: SomeBrand err:URLError
[send]   sent=35 failed=0 skipped_dup=3 log=logs/send-batch.log
[bounce] dsns=2 bounced_emails=2 log_updated=2 trashed=2 log=logs/bounces-2026-04-20.log
```

Per-row detail is in `logs/` if you need to investigate.

## How Claude should drive this

Read `OUTREACH.md` in full first — the pitch, template, and hard rules live
there. Then:

1. **Brand → domain** — call `Agent(subagent_type="general-purpose", model="haiku", …)`
   with the brand list; ask for `brand,domain` CSV output. Do NOT use Opus
   WebSearch for this step.
2. **Run the batch** — `./run-batch.sh <batch.csv> <account>`. Do not invoke
   `scrape-batch.py` / `send-batch.py` / `process-bounces.py` individually —
   they emit one useful line each and the orchestrator already chains them.
3. **Read only the summary.** If something looks off (high fallback count,
   non-zero sender failures, unexpected DSN count), then `cat` the matching
   `logs/*.log` file. Otherwise the run is done.

## Common commands (rare / manual)

Inspect last scrape log:

```bash
ls -t logs/scrape-*.log | head -1 | xargs cat
```

Sweep bounces outside a batch run (e.g. day-after follow-up):

```bash
python3 process-bounces.py --account <email> --since 24h
```

## Hard rules (summary — see OUTREACH.md for the full list)

- Only send to `email_source` starting with `https://`. Never to
  `hello@{domain}` fallbacks, never to Hunter or guessed patterns.
- Subject is always exactly `Stanford Student Inquiry`. Plain text body.
  No em dashes, no exclamations, no buzzwords.
- `send-batch.py` dedupes against `outreach-log.csv` by exact brand match —
  trust it, do not pre-filter manually.
- ≤~200 cold emails per account per day. Split across accounts and days.
