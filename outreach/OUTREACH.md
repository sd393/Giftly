# Giftly Outreach Playbook

Stanford/Dartmouth students connecting DTC brands with vetted, commission-paid
creators. Brands pay only on results, no contracts.

## Pitch (one-liner)

We match you with creators who actually drive sales. Pay commission only,
nothing upfront. This cold email exists to ask the founder if they want 2–3
pre-vetted creator profiles for their specific brand.

## Targets

DTC consumer brands already opted into creator-affiliate infrastructure
(Throne, Social Snowball, Levanta, LTK, Shopify Collabs merchant lists).
They've raised their hand — highest reply potential.

- Physical product: food/bev, supplements, beauty, skincare, apparel, home,
  pet, baby, wellness, fitness gear, jewelry, accessories.
- Revenue band where the founder still reads their own inbox (roughly
  $5M–$200M). Founder-led preferred.
- Sells primarily through their own Shopify / site / Amazon.

**Avoid:** SaaS, B2B, services, agencies, pure marketplaces, mega-brands with
in-house creator teams, pre-revenue brands.

## Email format

- **Subject** (exact, no variations): `Stanford Student Inquiry`
- **Body template** (substitute `{brand}`; use exact structure):

  ```
  Hi,

  We're Stanford/Dartmouth students connecting DTC brands with vetted creators. We match you with creators who actually drive sales, and you only pay commission on results, no contracts.

  Would you be interested in 2-3 creator profiles that'd be a great fit for {brand}?

  Thanks,
  Armaan
  ```

- Sign off `Thanks,\nArmaan`. Plain text only.
- No em dashes, no exclamation marks, no buzzwords, no flattery.
- Brand-name normalization: all-caps brands → Title Case; strip `By ` prefix.
  See `normalize_brand()` in `send-batch.py`.

### Example

**Subject:** Stanford Student Inquiry

```
Hi,

We're Stanford/Dartmouth students connecting DTC brands with vetted creators. We match you with creators who actually drive sales, and you only pay commission on results, no contracts.

Would you be interested in 2-3 creator profiles that'd be a great fit for Hydrant?

Thanks,
Armaan
```

## Workflow

For a list of target brands (e.g. merchants scraped/screenshotted from a
creator-platform directory):

### 1. Resolve domains — Haiku subagent

Spawn a Haiku subagent with the brand list; request `brand,domain` CSV
output. Never use Opus WebSearch for this — it's the single biggest token
sink and Haiku handles it fine.

```
Resolve the canonical root domain for each brand below. Return one line
per brand in `brand,domain` CSV format, no header. If a brand is
ambiguous or you can't resolve it, emit `brand,UNKNOWN`.

Brands:
- Alpinestars
- FOTOFOTO
- ...
```

Drop any `UNKNOWN` rows (or resolve manually) before moving on. Save the
result as `batch.csv`.

### 2. Run the batch — one command

```bash
GOG_KEYRING_PASSWORD=... ./run-batch.sh batch.csv <account-email>
```

`run-batch.sh` chains the three stages and prints one summary line per stage:

- **scrape** — `scrape-batch.py` fetches root, `/contact*`, `/about*` on each
  domain, extracts emails whose root domain matches, rewrites the CSV with
  `email` and `email_source`. Only `email_source` starting with `https://`
  counts as verified.
- **send** — `send-batch.py` filters to verified rows, dedupes against
  `outreach-log.csv` by exact brand match, sends each via `gog gmail send`
  with 3–8s jitter, appends to the log.
- **bounce** — `process-bounces.py` searches for DSNs from the last 30
  minutes, parses `X-Failed-Recipients:`, marks matching log rows `BOUNCED`,
  trashes the DSNs.

Per-row detail is written to `logs/scrape-<stem>.log`,
`logs/send-<stem>.log`, and `logs/bounces-<date>.log`. Only read those if the
summary looks off.

### 3. Driving this as Claude (Opus)

- **Read only the summary.** Don't `cat` the logs or invoke the underlying
  scripts manually. The whole point of this pipeline is to keep per-row
  output out of the Opus context window.
- **Delegate brand→domain to Haiku.** Every time, no exceptions.
- **Don't hand-edit outreach-log.csv** for bounces. `process-bounces.py` owns
  the bounce column.
- If a summary flags something (high fallback, non-zero send failures, an
  unexpectedly large DSN count), then read the matching `logs/*.log` —
  targeted, not wholesale.

## Sending accounts

- `armaan.priyadarshan.29@dartmouth.edu` — primary, higher volume.
- `armaanp4423@gmail.com` — secondary.

Both are authed via `gog`. Always pass `--account <email>` (or
`GOG_ACCOUNT`) explicitly — `gog` refuses to default when multiple accounts
are stored. `run-batch.sh` handles this via its second argument.

## Hard rules

- **Only verified-scraped emails.** `email_source` must start with `https://`.
- **No duplicate sends.** `send-batch.py` dedupes against `outreach-log.csv`;
  trust it.
- **Subject is always exactly** `Stanford Student Inquiry`.
- **No em dashes, exclamation marks, buzzwords, flattery.**
- Bounces are owned by `process-bounces.py` — don't retry guessed patterns
  and don't hand-edit the `verified` column.
- No Hunter, no pattern-guessing. Only addresses extracted from the brand's
  own contact page.
