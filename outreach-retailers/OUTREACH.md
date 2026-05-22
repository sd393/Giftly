# Giftly Mid-Size Retailer Outreach Playbook

Cold outreach to multi-brand retailers / marketplaces — pitching help on
product-data enrichment and surfacing across AI shopping/discovery
channels (ChatGPT Shopping, Atlas, Rufus, Gemini AI Mode, Copilot, etc.).

This is a **separate campaign** from `outreach/` (Throne brand pitch),
`outreach-agents/` (agentic-commerce data infra),
`outreach-brands-audit/` (single-brand DTC audit pitch), and
`outreach-creators/` (UGC creator pitch). Different audience, different
pitch, different log. Do not cross the streams: scripts here only
read/write `outreach-retailers/outreach-log.csv`.

The workflow shape matches `outreach-brands-audit/`:
**emails are provided manually, not scraped.** There is no scrape stage,
no domain resolution, no Haiku research subagent. Input CSV has the
emails already.

## Pitch (one-liner)

Multi-brand retailers need to enrich product data and show up in
AI-mediated shopping. We ask the founder / head of e-commerce / head of
digital if they're open to a quick conversation this week. The pitch is
not "free audit" — it's an open-ended chat.

## Targets

Multi-brand retailers and marketplaces — the layer above single-brand
DTC. Think Nordstrom, Bloomingdale's, Verishop, Goop, Revolve, Garmentory,
The Yes — regional and national multi-brand operators where merchandising
/ e-commerce leadership still reads inbound.

- Multi-brand retailers / marketplaces (online-first or omnichannel).
- Revenue band where a head of digital / e-commerce / merchandising
  still triages their own inbox. Founder-led or PE-backed mid-market.
- Owns merchandising and product data (i.e. carries other brands but
  controls how they're surfaced on the retailer's own properties).

**Avoid:** single-brand DTC (use `outreach-brands-audit/` instead),
mega-retailers with dedicated AI/agentic teams (Walmart, Amazon, Target —
they won't reply to a cold student email), pure marketplaces without
merchandising (eBay-shape), pre-revenue or hobby retailers.

## Email format

- **Subject** (exact, no variations): `Stanford Student Question - thoughts on AI retail tools`
- **Body** (uses `{name}` and `{company}` substitution — see `render_body` in `send-batch.py`):

  ```
  Hi {first-name},

  We're Stanford/Dartmouth students curious how {company} is thinking about AI, given 50 million people now shop with ChatGPT daily.

  Would you be open to a quick 10-minute call?

  If not, we would appreciate even a one-sentence response with your thoughts on how retailers are improving their visibility with AI.

  Thanks,
  Armaan
  ```

  Empty-value fallbacks:
  - Missing name → greeting collapses to `Hi,`
  - Missing company → `your company`

  The first word of `name` is used as the greeting first-name. If the
  source has `"Mary Laughton"`, the greeting is `Hi Mary,`.

### Follow-up template (second touch)

For non-responders on the first send, use the follow-up body in
`FOLLOWUP_BODY_TMPL` / `FOLLOWUP_BODY_HTML_TMPL`. **Reuse the original
subject line** the recipient received (so Gmail threads the messages) —
do not change the subject. For early sends this was
`Stanford/Dartmouth Student Inquiry`; for later sends it was the longer
`Stanford Student Question - thoughts on AI retail tools`. Check
the original send's subject before drafting the follow-up.

```
Hi,

Just wanted to follow up in case this message got lost in your inbox. We're working with brands valued over $300M+ and leading AI shopping platforms.

Would love to schedule a quick chat to discuss how retailers, marketplaces and brands are approaching agentic commerce.

Thanks,
Armaan
```

- Sign off `Thanks,\nArmaan`. Plain text only (an HTML mirror is also
  sent for clients that prefer it; both must stay in sync).
- No em dashes, no exclamation marks, no buzzwords, no flattery — same
  hygiene as the other campaigns.
- Greeting interpolates the first-name when available (`Hi Mary,`) and
  the body interpolates the retailer/company name. If either is missing,
  the empty-value fallback kicks in (no name → `Hi,`; no company →
  `your company`). The earlier "no substitutions" rule was retired
  2026-05-21 when this template version landed.
- **Every send CCs** the teammates listed in `CC_RECIPIENTS` in
  `send-batch.py` (currently Samarjit, Ethan, Shamit). Update that
  constant if the team changes; don't make CC per-batch.

## Workflow

For a list of retailer emails:

### 1. Prepare the input CSV

The campaign owner sources emails (manual research, scraped lists,
referrals, LinkedIn enrichment, etc.) and lands them in a CSV with at
minimum an `email` column.

Recommended headers (all optional except `email`):

```
email,retailer,name,notes
```

- `email` — **required.** Lowercased before dedup.
- `retailer` — preserved in the log; useful for follow-up bookkeeping.
  `brand` is also accepted as a fallback column name so a CSV reused
  from the brand-audit campaign flows through unchanged.
- `name` — preserved in the log AND used in body greeting via
  substitution (`Hi Mary,`). First word is taken as the first-name.
- `notes` — preserved in the log; freeform context.

Extra columns flow through to the log untouched.

Save as `batch.csv` (gitignored alongside the other campaigns).

### 2. Run the batch — one command

```bash
GOG_KEYRING_PASSWORD=... ./run-batch.sh batch.csv <account-email>
# optional: --dry-run
```

`run-batch.sh` chains the two stages and prints one summary line per
stage:

- **send** — `send-batch.py` dedupes against `outreach-log.csv` by
  normalized email, sends each via `gog gmail send` with 3-8s jitter,
  appends to the log. **No platform mirror** — retailer campaign data
  lives in CSV only.
- **bounce** — `process-bounces.py` searches for DSNs from the last 30
  minutes, parses `X-Failed-Recipients:`, marks matching log rows
  `BOUNCED`, trashes the DSNs.

There is no `[scrape]` stage — input emails are trusted as provided.

Per-row detail lands in `logs/send-<batch-stem>.log` and
`logs/bounces-<date>.log`.

### 3. Driving this as Claude (Opus)

- **Read only the summary.** Don't `cat` the logs unless something
  looks off (high failed count, unexpected DSN count).
- **Don't hand-edit outreach-log.csv** for bounces. `process-bounces.py`
  owns the bounce column.
- **No domain research subagent.** Unlike the Throne brand and agent
  campaigns, there is nothing to delegate to Haiku here. Emails come
  in pre-verified by the user.
- If the user hands over a list with a non-trivial fraction of obvious
  garbage (malformed emails, role addresses, duplicates), surface that
  before kicking off the batch — don't silently let it run. The script
  will skip duplicates against the log but does not validate format.

## One-off send overrides

When a single send needs a different subject or body (referral pitch,
Dartmouth-only framing for a specific recipient, etc.) without editing
the file template, override the module constants in-memory inside the
inline Python wrapper:

```python
import importlib.util
from pathlib import Path
ROOT = Path('/home/armaan/Documents/Giftly/outreach-retailers')
spec = importlib.util.spec_from_file_location('s', ROOT / 'send-batch.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

# Override before calling send_one. The file is untouched.
m.SUBJECT_TMPL = 'Dartmouth Student Inquiry - Referred by Roy Schmidt'
# Optionally also m.BODY_TMPL = "..." and m.BODY_HTML_TMPL = "..."

ok, info, body, ext_id = m.send_one(
    'recipient@example.com', dry_run=False,
    name='Jane Doe', company='Example Co',
)
```

Each `python3` invocation is a fresh interpreter, so the override only
applies to that single batch. Examples in this campaign:

- 4 Roy-Schmidt-referral sends on 2026-05-20 (subject-only override).
- 1 Dartmouth-only send to `kathryn@aillea.com` on 2026-05-21 (subject
  + body override).

Tag overridden rows in `notes` so `send-followups.py` knows to skip
them (it already checks for `roy schmidt` in notes).

## Sending accounts

Reuse the same `gog`-authed accounts as the other campaigns:

- `armaan.priyadarshan.29@dartmouth.edu` — default for this campaign.
- `armaanp4423@gmail.com` — secondary.

Pass `--account <email>` (or `GOG_ACCOUNT`) explicitly. `run-batch.sh`
handles this via its second argument.

CC'd on every send (not used as senders):
`samarjit.deshmukh.29@dartmouth.edu`, `ethanpzhou@berkeley.edu`,
`shamitd@stanford.edu`. Replies hitting "Reply All" land in those
inboxes too — coordinate before changing the list.

## Hard rules

- **No platform mirror.** Retailer campaign does not write to the
  Giftly internal platform. If we want it later, add a `--mirror` flag;
  don't silently turn it on.
- **No duplicate sends.** `send-batch.py` dedupes against
  `outreach-log.csv` (this directory's, not the others') by normalized
  lowercase email. The other campaign logs live separately, so
  cross-campaign dedup is manual if it matters — and it might, since a
  retailer that's also a DTC brand could appear in both lists.
- **Subject and body live in `send-batch.py`.** Body uses `{name}` and
  `{company}` substitution via `render_body()`. Empty values fall back
  gracefully (`Hi,` and `your company`). Don't add new placeholders
  without updating both the body templates and `render_body()`.
- **Bounces are owned by `process-bounces.py`** — don't retry or
  hand-edit the `verified` column.
- **No fallback / pattern-guessed addresses.** This campaign has no
  fallback path because there is no scrape stage. If a row has no
  email, drop it from the input CSV before running.
