# Throne Merchants Outreach Campaign

Campaign sent 2026-04-19 / 2026-04-20 to Throne.com merchants, pitching
Stanford/Dartmouth creator-matching (commission-paid, no-contract creators).

## Result

- **712 emails sent, 0 send failures**
- **191** from `armaanp4423@gmail.com` (batches 1, 3, 4, 6, 7)
- **521** from `armaan.priyadarshan.29@dartmouth.edu` (batches 5, 8–22)
- **4 tracked bounces** (marked `BOUNCED` in `outreach-log.csv`):
  ROYBI Robot, By Adina Eden, Nana Jacqueline, Freedom Rave Wear
- Cleanup: 7 bounce notifications trashed on armaanp4423,
  328 historical bounces trashed on dartmouth account

## Message

- **Subject** (exact): `Stanford Student Inquiry`
- **Body** (substitute `{brand}`):
  ```
  Hi,

  We're Stanford/Dartmouth students connecting DTC brands with vetted creators. We match you with creators who actually drive sales, and you only pay commission on results, no contracts.

  Would you be interested in 2-3 creator profiles that'd be a great fit for {brand}?

  Thanks,
  Armaan
  ```
- Brand-name normalization: all-caps tokens → Title Case; `By X` prefix stripped.
  See `normalize_brand()` in `send-throne-batch.py`.

## Pipeline

Source: 22 screenshots of the Throne merchant grid (bot-protected, so
extracted brand names visually rather than scraping the page).

For each of 22 batches of ~60 brands:

1. **Domain research** — spawn a research subagent with WebSearch to return
   `BrandName,domain.com` lines. Truncated names disambiguated. Duplicates
   from prior batches dropped.
2. **Contact-page scrape** — `scrape-throne-batch.py <batch.csv>` fetches
   root, `/contact`, `/pages/contact*`, `/about*` on each brand's domain,
   extracts emails whose root domain matches the brand, rewrites the CSV
   with `email` and `email_source` columns. Only `email_source` starting
   with `https://` counts as verified; `fallback` rows are never sent.
3. **Dedupe** — `send-throne-batch.py` excludes any brand already in
   `outreach-log.csv` by exact brand-column match.
4. **Send** — `gog --account <email> gmail send` per row with randomized
   3–8s spacing. Each send appends to `outreach-log.csv`
   (`brand,domain,email,date_sent,verified,llm_evidence=throne-merchant`).
5. **Bounce check** — after each batch, search
   `from:mailer-daemon@googlemail.com newer_than:1h`, correlate message IDs
   back to brands, mark those rows `BOUNCED` in the log.

## Files

| File | Purpose |
| ---- | ------- |
| `throne-batch-1.csv` … `throne-batch-22.csv` | per-batch input+output (brand, domain, email, email_source) |
| `scrape-throne-batch.py` | urllib contact-page scraper (24 workers, 6s per-fetch timeout, 45s per-brand deadline) |
| `scrape-curl.py` | curl-subprocess fallback scraper (used when urllib hangs). Less reliable — Cloudflare/Shopify returned 429 for most Shopify-hosted brands. Kept for reference only; **prefer urllib**. |
| `send-throne-batch.py` | sender. Reads `GOG_ACCOUNT` (defaults to `armaanp4423@gmail.com`), requires `GOG_KEYRING_PASSWORD`. |
| `outreach-log.csv` | canonical log (both batches and prior campaigns). |

## Gotchas learned

- **urllib hangs on specific slow sites.** Thread-pool workers can stall
  indefinitely inside `r.read()` even with `socket.setdefaulttimeout`.
  Fixed with a per-brand wall-clock deadline (`BRAND_DEADLINE = 45s`)
  checked between fetches. Not perfect — still needed one hard-kill retry
  on batch-5. Batch-5 eventually completed via `scrape-curl.py`, the only
  batch that did.
- **curl gets 429'd on Shopify-hosted brands.** `WORKERS=16` with curl
  triggered Cloudflare/Shopify rate limiting; `scrape-curl.py` on batches
  11/12 returned 1-2 real emails out of 57. Re-running the same CSVs with
  `scrape-throne-batch.py` (urllib) recovered 32–36 real emails per batch.
  **Default to urllib, use curl only if urllib hangs.**
- **`gog` requires `--account` when multiple accounts are stored.** After
  auth'ing the gmail account, previously-implicit sends started failing
  with `missing --account`. The send script now passes `--account`
  explicitly from the `GOG_ACCOUNT` env var.
- **Cloudflare/Vercel blocks the Throne merchant grid itself** (Vercel
  Security Checkpoint) — can't scrape the list programmatically, only
  visually from screenshots.

## Replicating for another creator-platform merchant list

1. Screenshot or paste the merchant grid.
2. For each batch of ~60 brands, hand off to a research subagent to produce
   a `brand,domain` CSV.
3. Run `python3 scrape-throne-batch.py <batch.csv>`.
4. `GOG_KEYRING_PASSWORD=... GOG_ACCOUNT=... python3 send-throne-batch.py <batch.csv>`.
5. After the batch, check bounces and update `verified` column.

One account shouldn't send more than ~200 cold emails/day through Gmail
without warming — split across accounts and pace across multiple days.
