# Giftly Outreach

Cold-email tooling for the Stanford/Dartmouth creator-matching pitch
(Giftly). Scrapes brand contact pages, sends from authenticated Gmail
accounts via the `gog` CLI, logs results.

## Setup

### 1. Environment variables

Set in your shell rc or per-session:

```bash
export GOG_KEYRING_PASSWORD="<your gog keyring password>"
export GOG_ACCOUNT="armaan.priyadarshan.29@dartmouth.edu"   # or armaanp4423@gmail.com
```

### 2. gog authentication

Two accounts should be stored:

```bash
gog auth list
```

If re-auth is needed:

```bash
gog auth add armaan.priyadarshan.29@dartmouth.edu --services gmail --force-consent
gog auth add armaanp4423@gmail.com --services gmail --force-consent
```

When more than one account is stored, `gog` requires `--account <email>` on
every call (or `GOG_ACCOUNT` in env) — the scripts here pass it explicitly.

## Files

| File | Purpose |
| ---- | ------- |
| `OUTREACH.md` | playbook: pitch, email template, workflow, hard rules |
| `THRONE-CAMPAIGN.md` | retrospective of the 712-send Throne campaign on 2026-04-19/20 |
| `outreach-log.csv` | canonical log, schema: `name,role,brand,domain,email,date_sent,verified,llm_evidence` |
| `throne-batch-*.csv` | per-batch inputs (brand, domain, email, email_source) for the Throne campaign |
| `scrape-throne-batch.py` | urllib contact-page scraper (primary) |
| `scrape-curl.py` | curl-subprocess scraper (fallback — frequently 429'd on Shopify) |
| `send-throne-batch.py` | sends `Stanford Student Inquiry` template, skips fallbacks, dedupes against log |

## Common commands

Scrape a new brand list (CSV must have `brand,domain` columns):

```bash
python3 scrape-throne-batch.py <batch.csv>
```

Send to the verified-scraped rows only:

```bash
GOG_KEYRING_PASSWORD=... GOG_ACCOUNT=armaanp4423@gmail.com \
  python3 send-throne-batch.py <batch.csv>
```

Check bounces from the last hour:

```bash
gog --account <email> gmail messages search \
  'from:mailer-daemon@googlemail.com newer_than:1h' --max 200
```

Trash all bounces on an account:

```bash
gog --account <email> gmail trash --query 'from:mailer-daemon' --max 2000 -y
```

## Workflow

See `OUTREACH.md` for the playbook. See `THRONE-CAMPAIGN.md` for a worked
example (712 sends across 22 batches, with the gotchas that bit during it).

## Claude Code instructions

- Only send to rows where `email_source` starts with `https://` (real
  scraped contact-page addresses). Never send to `hello@{domain}` fallbacks.
- Always pass `--account` to `gog` (or set `GOG_ACCOUNT`). Don't rely on a
  default sender.
- Dedupe against `outreach-log.csv` by exact brand-column match before each
  batch — `send-throne-batch.py` does this automatically.
- After each batch: check bounces, mark matching rows `BOUNCED`, trash the
  DSNs.
- Do not use Hunter or guess email patterns. The current workflow only
  accepts emails extracted from the brand's own contact page.
