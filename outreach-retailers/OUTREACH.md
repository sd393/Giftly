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
- **Body** (no substitutions — body is fixed in `send-batch.py`):

  ```
  Hi,

  We're Stanford/Dartmouth students helping specialty retailers take advantage of AI shopping.

  We're working with brands valued over $300M+ and leading shopping agent platforms.

  Happy to send a short report we compiled on your catalog.

  Thanks,
  Armaan
  ```

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
- Greeting is `Hi,` with no name interpolation, even if the input CSV
  has a `name` or `retailer` column. Reason: a misspelled or wrong-cased
  name reads worse than no name. Names/retailers are kept in the log
  for follow-up bookkeeping, not the body.
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
- `name` — preserved in the log; not used in body.
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
- **Subject and body live in `send-batch.py`.** Body is a literal
  string with no substitutions — do not introduce `{retailer}` or
  `{name}` interpolation without changing the playbook.
- **Bounces are owned by `process-bounces.py`** — don't retry or
  hand-edit the `verified` column.
- **No fallback / pattern-guessed addresses.** This campaign has no
  fallback path because there is no scrape stage. If a row has no
  email, drop it from the input CSV before running.
