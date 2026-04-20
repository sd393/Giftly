# Giftly Outreach Playbook

Stanford/Dartmouth students connecting DTC brands with vetted, commission-paid
creators. Brands pay only on results, no contracts.

## Pitch (one-liner)

We match you with creators who actually drive sales. Pay commission only,
nothing upfront. This cold email exists to ask the founder if they want 2–3
pre-vetted creator profiles for their specific brand.

## Targets

DTC consumer brands already opted into creator-affiliate infrastructure
(e.g. Throne, Social Snowball, Levanta, LTK, Shopify Collabs merchant lists).
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
  See `normalize_brand()` in `send-throne-batch.py`.

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

For a list of target brands (e.g. merchants scraped from a creator-platform
directory):

1. **Resolve domains** — one `brand,domain` line per target. A research
   subagent with WebSearch access is the fastest way to turn a name list
   into a `brand-batch.csv`.
2. **Scrape contact emails** — `python3 scrape-throne-batch.py <batch.csv>`
   fetches root, `/contact`, `/pages/contact*`, `/about*` on each brand's
   domain, extracts emails whose root domain matches, rewrites the CSV with
   `email` and `email_source` columns. Fall back to `scrape-curl.py` only if
   urllib hangs (note: curl gets Cloudflare 429s on Shopify-hosted sites).
3. **Only send to rows with `email_source` starting with `https://`.** Never
   send to `hello@{domain}` fallbacks — they bounce at high rates. No
   Hunter, no guessed patterns, no generic mailboxes.
4. **Dedupe** — `send-throne-batch.py` drops any brand already in
   `outreach-log.csv` by exact brand-column match before sending.
5. **Send** — `GOG_KEYRING_PASSWORD=... GOG_ACCOUNT=<sender> python3
   send-throne-batch.py <batch.csv>`. 3–8s randomized spacing per send.
   Appends each send to `outreach-log.csv` with
   `verified=sent,llm_evidence=throne-merchant` (retag per source).
6. **Bounce check** — after the batch, search
   `gog gmail messages search 'from:mailer-daemon@googlemail.com newer_than:1h'`,
   correlate message IDs back to brands, mark those rows `BOUNCED` in the
   log, and trash the DSN messages.

## Sending accounts

- `armaan.priyadarshan.29@dartmouth.edu` — primary, higher volume.
- `armaanp4423@gmail.com` — secondary, split load to stay under per-account
  warmth limits.

Both are authed via `gog`. Always pass `--account <email>` (or
`GOG_ACCOUNT`) explicitly — `gog` refuses to default when multiple accounts
are stored.

## Hard rules

- **Only verified-scraped emails.** `email_source` must start with `https://`.
- **No duplicate sends.** Check `outreach-log.csv` before queuing.
- **Subject is always exactly** `Stanford Student Inquiry`.
- **No em dashes, exclamation marks, buzzwords, flattery.**
- Pace so no single account exceeds ~200 cold emails/day. Split across
  accounts and days for larger lists.
- Record bounces as `BOUNCED` in `outreach-log.csv` (don't retry guessed
  patterns — we only send to scraped addresses).
