# Giftly Mid-Size Retailer Outreach

Cold-email tooling for the multi-brand retailer / marketplace pitch
(product-data enrichment + AI shopping discovery). Sibling of `outreach/`
(Throne brand campaign), `outreach-agents/` (shopping agents),
`outreach-creators/` (UGC creators), and `outreach-brands-audit/`
(single-brand DTC) — fully separate scripts, separate log, no platform
mirror.

This is the **retailer** campaign — Nordstrom/Verishop/Goop scale, not
single-brand DTC. Same no-scrape architecture as the brand-audit fork:
the campaign owner curates the list; the script sends, dedupes, logs,
and sweeps bounces.

Pitch and audience live in `OUTREACH.md`. Read that first.

## Setup

Same `gog` auth as the other campaigns — both sender accounts are already
authed if `outreach-brands-audit/` works.

```bash
export GOG_KEYRING_PASSWORD="<your gog keyring password>"
export GOG_ACCOUNT="armaan.priyadarshan.29@dartmouth.edu"   # or armaanp4423@gmail.com
```

To re-auth:

```bash
gog auth add armaan.priyadarshan.29@dartmouth.edu --services gmail --force-consent
```

## Files

| File | Purpose |
| ---- | ------- |
| `OUTREACH.md` | playbook: pitch, target audience, template, hard rules, workflow |
| `CAMPAIGN.md` | day-1 campaign retrospective: stats, pattern discoveries, what worked |
| `outreach-log.csv` | canonical log: `name,retailer,email,date_sent,verified,notes` (created on first send) |
| `run-batch.sh` | one-shot orchestrator: send -> bounce-sweep |
| `send-batch.py` | sender; dedupes against this dir's log; summary-only stdout; **no platform mirror**. Also exports `FOLLOWUP_BODY_TMPL` / `FOLLOWUP_BODY_HTML_TMPL` used by `send-followups.py` |
| `send-followups.py` | bulk follow-up sender: targets sent-but-no-real-reply rows for a given date, sends each as a threaded reply via `--reply-to-message-id` + `--reply-all` |
| `process-bounces.py` | finds DSNs, marks bounced rows `BOUNCED`, trashes DSNs |

There is no scraper, no `giftly_api.py`, no domain-resolution stage on
purpose — the retailer campaign relies entirely on the curated input
list (same as `outreach-brands-audit/`).

## Input CSV

Required header: `email`. Recommended: `retailer,name,notes`.
Extra columns flow through to the log.

```csv
email,retailer,name,notes
ecommerce@nordstrom.example,Nordstrom,,
buyers@verishop.example,Verishop,,
press@goop.example,Goop,,
```

`retailer` is preferred but `brand` is also accepted (the sender falls
back to `brand` if `retailer` is missing) so a CSV reused from the
brand-audit campaign flows through without renaming.

Save as `batch.csv` (gitignored).

## One-shot batch

```bash
./run-batch.sh <batch.csv> <account-email>
# optional: --dry-run
```

Output is ~3-5 lines: one summary per stage.

```
[send]   sent=15 failed=0 skipped_dup=2 skipped_invalid=0 skipped_no_email=0 log=logs/send-batch.log
[bounce] dsns=1 bounced_emails=1 log_updated=1 trashed=1 log=logs/bounces-2026-05-19.log
```

Per-row detail is in `logs/` if you need to investigate.

## Follow-up workflow

When you want to send a second-touch follow-up to the recipients who
didn't respond (or only auto-replied):

```bash
GOG_KEYRING_PASSWORD=... python3 send-followups.py --dry-run   # plan only
GOG_KEYRING_PASSWORD=... python3 send-followups.py             # actually send
```

`send-followups.py`:

1. Builds `{recipient -> latest gmail message ID}` from the sent folder
   (`in:anywhere` query — catches trashed bounces with no DSN).
2. Classifies inbox replies as real vs auto (OOO / automatic reply /
   delay in response are auto and still get followed up).
3. Targets only the `TARGET_DATE` (currently hard-coded to
   `2026-05-19`; edit at the top of the script for other days).
4. Excludes BOUNCED rows, personal-domain rows (`gmail.com`, etc.),
   and Roy-Schmidt-referral sends.
5. Sends each follow-up as a true reply via
   `gog gmail send --reply-to-message-id <id> --reply-all --subject <original>`,
   so Gmail threads it into the original conversation and re-CCs the team.
6. Appends `followed_up <date>` to the `notes` column for each target.

Outcomes so far:
- Day 1 follow-up (2026-05-21): 107 sends covering 2026-05-19 sends, 0 failures.
- Day 2 follow-up (2026-05-22): 230 sends covering 2026-05-20 sends, 0 failures.

See `CAMPAIGN.md` for the full retrospective including per-retailer
email patterns, template evolution, and one-off override examples.

## Template substitution

`BODY_TMPL` and `BODY_HTML_TMPL` use `{name}` and `{company}`
placeholders. `render_body(name, company)` (in `send-batch.py`) does
the substitution with safe fallbacks:

- Empty `name` → greeting collapses to `Hi,`
- Empty `company` → defaults to `your company`
- First word of `name` is used as the greeting first-name

`send_one(email, *, dry_run, name="", company="")` accepts the
substitution kwargs. The batch loop pulls them from the input CSV's
`name` and `retailer` (or `brand`) columns. For paste-and-send flows,
pass them explicitly when calling `send_one` directly.

## How Claude should drive this

Read `OUTREACH.md` in full first. Then:

1. **Sanity-check the input CSV.** The script skips rows with missing or
   malformed emails, but it doesn't lint the list end-to-end. If you see
   obvious duplicates within the input, role addresses
   (`info@`, `press@`), or non-retailers slipped in, flag them before
   kicking off.
2. **Run the batch** — `./run-batch.sh <batch.csv> <account>`. Do not
   invoke `send-batch.py` / `process-bounces.py` individually — the
   orchestrator chains them and emits one summary line per stage.
3. **Read only the summary.** If `failed > 0` or `skipped_invalid > 0`
   or `dsns` is unexpectedly high, then `cat` the matching `logs/*.log`.
   Otherwise the run is done.

## Hard rules (summary — see OUTREACH.md for the full list)

- Subject is always exactly `Stanford/Dartmouth Student Inquiry`. Plain
  text body. No em dashes, no exclamations, no buzzwords.
- Body is fixed (no `{retailer}` / `{name}` interpolation). The greeting
  is `Hi,` even when the input CSV has a `retailer` or `name` column.
- `send-batch.py` dedupes against `outreach-log.csv` (this directory's
  log) by lowercased email. Trust it; do not pre-filter manually.
- No platform mirror. CSV is the only source of truth.
- Bounces are owned by `process-bounces.py` — don't hand-edit `verified`.
