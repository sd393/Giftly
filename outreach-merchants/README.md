# Giftly Indie Shopify Merchant Outreach

Cold-email pipeline for small-to-mid single-brand DTC merchants on
Shopify ($1-5M MRR shape). Sibling of `outreach/` (Throne),
`outreach-agents/` (shopping agents), `outreach-brands-audit/`
(brand audit pitch), `outreach-creators/` (UGC creators), and
`outreach-retailers/` (multi-brand retailers).

This is the **fully-automated** fork. Unlike the manual paste-and-send
campaigns, this one does end-to-end sourcing + per-domain contact
discovery + Hunter-verified send. v5 template from
`outreach-retailers` is reused verbatim.

Read `OUTREACH.md` first for the playbook (audience, pitch, hard rules).

## Pipeline

```
source-publicwww.py    → candidates.csv   (Shopify domains via PublicWWW)
discover-contacts.py   → contacts.csv     (founder names + explicit emails)
verify-emails.py       → verified.csv     (Hunter strict-gate survivors)
send-batch.py          → outreach-log.csv (sends, threaded via gog)
process-bounces.py     → marks BOUNCED in outreach-log.csv
```

The orchestrator `run-campaign.sh <account-email>` chains all stages.
Stages are independent: `--skip-source` and `--skip-discover` let you
resume from a later step without redoing earlier work.

## Files

| File | Purpose |
| ---- | ------- |
| `OUTREACH.md` | playbook: audience, pitch (v5 verbatim), hard rules |
| `outreach-log.csv` | canonical send log (created on first send) |
| `.env` | `HUNTER_API_KEY` — gitignored |
| `source-publicwww.py` | drives gstack browse binary through PublicWWW queries; aggregates ~5 visible URLs/query; dedupes against all sibling logs |
| `trimmed.csv` | human-trimmed final candidate list (manual step between source + discover) |
| `discover-contacts.py` | for each domain, fetches /pages/about + variants via browse binary; extracts founder name + explicit on-domain emails |
| `verify-emails.py` | Hunter `/v2/email-verifier` strict gate (status=valid + accept_all=false); pattern-guesses emails for named contacts; cross-dedup against all sibling logs |
| `send-batch.py` | forked from `outreach-retailers/send-batch.py`, v5 template verbatim |
| `process-bounces.py` | identical to retailers; marks DSN'd rows BOUNCED |
| `run-campaign.sh` | one-shot orchestrator |
| `candidates.csv` / `contacts.csv` / `verified.csv` | stage outputs (gitignored) |

## Setup

```bash
# Hunter API key (currently using free verifier — 50 verifications/month)
echo 'HUNTER_API_KEY=...' > .env

# gog auth (same as other campaigns)
export GOG_KEYRING_PASSWORD="<your gog keyring password>"
export GOG_ACCOUNT="armaan.priyadarshan.29@dartmouth.edu"
```

`bs4` and `requests` are required for the Python scripts; both are
installed system-wide on this machine.

## End-to-end run

```bash
./run-campaign.sh armaan.priyadarshan.29@dartmouth.edu --dry-run
# then drop --dry-run
```

Each stage prints a one-line summary. Per-row detail goes to `logs/`.

## ⚠ Current state (2026-05-22)

The pipeline is **built and working** but blocked at the verify stage
by the **Hunter free-tier monthly quota** (50 verifications/month).
We exhausted it during today's 10-person test build-out (~33 calls).
Hunter returns HTTP 429 with body
`"You've reached the limit for the number of verifications per billing
period included in your plan."` — that's the monthly cap, not a
per-minute throttle.

Outputs so far in this directory:
- `candidates.csv` — 63 sourced Shopify candidates (mixed beauty +
  noise: music plugins, publishers, jewelry false positives)
- `trimmed.csv` — 11 manually-trimmed indie skincare candidates
- `contacts.csv` — 14 contact rows (3 named founders, 11 explicit role addrs)
- `verified.csv` — 2 Hunter-verified survivors:
  - `joshua@littlebarnapothecary.com` — Joshua Morgan, founder (score=100)
  - `info@itreatskin.com` — explicit role (score=100)

The other 12 contact rows either failed verification (named-guess
patterns came back invalid — none of `shelley@`, `shelley.martin@`,
`smartin@`, `shelleymartin@` were real for Skinician's Shelley Martin)
or got 429'd before being tried.

## Resuming when quota resets

Hunter free-tier resets monthly. When quota is back:

```bash
./run-campaign.sh armaan.priyadarshan.29@dartmouth.edu --skip-source --skip-discover
```

This re-runs `verify-emails.py` against the existing `contacts.csv`
and continues into `send-batch.py` once survivors are written.

## Alternate verifier (recommended for production)

To break the 50/month ceiling, add a second verifier:
- **NeverBounce** free: 100 verifications/month
- **MailerCheck** free: 200 verifications/month
- **ZeroBounce** free: 100 verifications/month

`verify-emails.py` would need a small refactor to try Hunter first then
fall back to the secondary on 429. Not yet done.

## Cold-call list (separate artifact)

Run separately by a subagent on 2026-05-22 to produce a manual-outreach
list while the pipeline is quota-blocked:

- `cold-call-list.csv` — 200ish indie skincare/clean-beauty Shopify
  brand websites for manual research. Sources: Petit Vour archives,
  EWG Skin Deep VERIFIED, Indie Beauty Expo directories, PublicWWW
  high-rank end. Not part of the pipeline output — for offline use.

## How Claude should drive this

Read `OUTREACH.md` first (audience, pitch, hard rules). Then:

1. **Sourcing.** `source-publicwww.py` is best-effort. Free PublicWWW
   shows ~5 URLs per query, so 20 queries → ~100 raw candidates → ~10-15
   real DTC after filter. Each query costs a browse goto (~3s).
2. **Manual trim.** After sourcing, eyeball `candidates.csv` and write
   the final candidates to `trimmed.csv` with `domain,brand` columns.
   This is the one human-in-loop step. Drop multi-brand retailers,
   off-vertical false positives, mega-brands.
3. **Discover + verify.** Both are fully automated. Discover takes
   ~3-5 minutes for 10-15 domains; verify is paced at 4s/call to
   respect Hunter rate limits.
4. **Read only the per-stage summary lines.** Don't cat logs unless
   something looks off.
5. **Bounces are owned by `process-bounces.py`.** Don't hand-edit
   `verified` column.

## Hard rules (summary — see OUTREACH.md)

- v5 template verbatim. Subject is exactly
  `Stanford Student Question - thoughts on AI retail tools`.
- Body uses `{name}` / `{company}` substitution via `render_body()`.
- Every send CCs `samarjit/ethan/shamit`.
- **No bounces.** Hunter strict gate is `status:valid AND
  accept_all:false`. Score is NOT a gate (real deliverable mailboxes
  often score below 80).
- Cross-campaign dedup against all sibling `outreach-*/outreach-log.csv`
  is applied automatically in `verify-emails.py`.
- No platform mirror.
