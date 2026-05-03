# Throne batch 23 — autonomous send progress

Live state of the second Throne campaign run. Updated by `send-autonomous.py`
after every chunk; pre-send setup steps logged here by hand.

## Source

17 screenshots of the Throne 0%-fee merchant grid pasted on 2026-04-28.

- 1002 raw brand names extracted
  → `throne-batch-23-raw-brands.txt`
- 153 mega-brands / mass retailers / cosplay-retail dropped per OUTREACH.md
  scope rules (Amazon, Disney, Apple, lululemon, REVOLVE, Hot Topic, ...)
  → `throne-batch-23-dropped.txt`
- 7 already in `outreach-log.csv` from prior Throne run
  (GTHIC, Sweet Addison's, SACHEU Beauty, for Love & Lemons, Brooklinen,
  Smoko, 32 Degrees) → handled by send-batch dedup
- 849 to research

## Setup steps (2026-04-28 ~04:00 ET)

- [x] Mega-brand filter applied — `filter-mega-brands.py`
- [x] Domain resolution split into 4 chunks of ~213 — Haiku general-purpose
      subagents writing `throne-batch-23-chunk-{1..4}.csv`
- [x] `send-autonomous.py` built — chunked sender with primary→secondary
      account fallback on rate-limit detection (failed_ratio ≥ 0.3 OR
      stderr contains rate-limit signals)
- [x] `send-batch.py` patched to allow `--dry-run` without
      `GOG_KEYRING_PASSWORD` (gog itself doesn't need it for dry-run)
- [ ] Concatenate chunk CSVs → `batch-2026-04-28.csv`
- [ ] Run `scrape-batch.py` to populate email + email_source
- [ ] Dry-run send on a 5-row slice to verify CC+body+subject wiring
- [ ] Real autonomous send loop

## Send config

- Primary account: `armaan.priyadarshan.29@dartmouth.edu`
- Secondary (fallback): `armaanp4423@gmail.com`
- CC every send: `samarjit.deshmukh.29@dartmouth.edu`,
  `ethanpzhou@berkeley.edu`, `shamitd@stanford.edu`
- Subject: `Stanford Student Inquiry`
- Body: "We're Stanford/Berkeley/Dartmouth students…" (see
  `send-batch.py:BODY_TMPL`)
- Chunk size: 60 (5 chunks/hour at 12 min spacing)
- Sleep between chunks: 120s
- Stop conditions: both accounts rate-limited in same chunk, all chunks done,
  or process killed

## Chunk timeline

(populated by send-autonomous.py once the real run begins)
- 2026-04-28 04:12  plan: verified=276 pre_dedup_skip=0 to_send=276 chunks=5 chunk_size=60
- 2026-04-28 04:18  chunk 001/5  sent=60 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 04:28  chunk 002/5  sent=60 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 04:36  chunk 003/5  sent=60 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 04:45  chunk 004/5  sent=60 failed=0 skipped=0 acct=armaan.priyadarshan.29  RATE-LIMIT?
- 2026-04-28 04:45  swapping to secondary armaanp4423@gmail.com
- 2026-04-28 04:45  chunk 004/5 retry  sent=0 failed=0 skipped=60 acct=armaanp4423
- 2026-04-28 04:51  chunk 005/5  sent=36 failed=0 skipped=0 acct=armaanp4423
- 2026-04-28 04:51  done. total_sent=276 total_failed=0 primary_rate_limited=True secondary_rate_limited=False

## Round 1 retro (2026-04-28 ~05:00)

- All 276 verified brands sent successfully, 0 send failures.
- Last dartmouth send: Nguyen Coffee Supply (chunk 4). Last armaanp4423 send: Kizik (chunk 5).
- Chunk 4 RATE-LIMIT? flag was a false positive — sent=60 failed=0; the
  detector matched the rate-limit regex against innocuous log text. Real
  outcome: dartmouth was fine; we swapped to secondary unnecessarily for
  chunk 5. Tighten the detector before next round (require failed >= 1
  alongside the regex match).
- Body formatting verified clean (pulled message id 19dd343d5415f193 from
  Sent folder; paragraphs intact, no mid-paragraph wraps).

## Round 2 plan (re-research UNKNOWNs)

- 401 brands the first Haiku pass couldn't resolve.
- Second pass: 2 parallel Haiku general-purpose agents, ~200 brands each,
  prompts emphasize Throne/DTC context and screenshot-truncation hints.
- After resolution: scrape → autonomous send. Stay on dartmouth as primary;
  swap on real failures only.
- 2026-04-28 14:05  plan: verified=133 pre_dedup_skip=3 to_send=130 chunks=3 chunk_size=60
- 2026-04-28 14:12  chunk 001/3  sent=60 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 14:21  chunk 002/3  sent=60 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 14:24  chunk 003/3  sent=10 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 14:24  done. total_sent=130 total_failed=0 primary_rate_limited=False secondary_rate_limited=False

## Round 2 retro (2026-04-28 ~14:30)

- 130 sent (3 dedup-skipped against round-1 log), 0 failures, all dartmouth.
- No rate-limit triggers — tightened detector held.
- Round-2 chunk-1 agent claimed 189/201 resolved but only WROTE 100 rows
  to its CSV — 101 brands silently dropped. Compensated by reconstructing
  the still-unresolved set from the filtered list minus actually-resolved.
- 0 bounces across both accounts in 12h. Cumulative today: 406 sent /
  0 failed / 0 bounces.

## Round 3 plan

- 200 brands still unresolved across rounds 1+2. Two parallel Haiku
  agents, 100 each, with explicit instruction "write every input brand,
  including UNKNOWN" so we don't lose rows again.
- Then scrape → autonomous send. Same primary/secondary config.
- 2026-04-28 14:34  plan: verified=106 pre_dedup_skip=0 to_send=106 chunks=2 chunk_size=60
- 2026-04-28 14:41  chunk 001/2  sent=60 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 14:48  chunk 002/2  sent=46 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 14:48  done. total_sent=106 total_failed=0 primary_rate_limited=False secondary_rate_limited=False

## Run-end retro (2026-04-28 ~14:50)

**Cumulative today: 512 sent, 0 send-time failures, 5 BOUNCED (0.97%).**

| Round | Sent | Account split | Notes |
|---|---|---|---|
| R1 | 276 | 240 dartmouth + 36 armaanp4423 | Chunk 4 false-positive triggered unneeded swap |
| R2 | 130 | 130 dartmouth | All clean |
| R3 | 106 | 106 dartmouth | All clean |

Account totals today: dartmouth 476, armaanp4423 36.

Bounces (5/512 = 0.97%, swept during the autonomous run):
- Chargeasap (support@chargeasap.com)
- centinelle (advocate@centinelle.com)
- Beyond Polish (support@beyondpolish.com)
- Farsedakis Beauty (complaints@farsedakis.com)
- Zombie Ghost (human@zombie.clothing)

Coverage of the original 1002-brand grid:
- 153 dropped pre-research (mega/mass-retail per OUTREACH.md scope)
- 7 already in log from prior Throne run
- 512 contacted today
- 318 verified-domain but blocked by playbook (scrape only found `hello@`
  fallback addresses; OUTREACH.md forbids those)
- 15 still unresolved after 3 Haiku passes
- ≈ 60% of the in-scope grid contacted; fallback brands need a different
  channel (LinkedIn, manual research) per agent-campaign playbook.

## What's left that we did NOT send to

- `throne-batch-23-r3-chunk-{1,2}.csv` UNKNOWN rows (15)
- 318 brands across all 3 rounds that scraped only to `hello@domain`
  fallback (playbook block — synthesized pattern guesses harm sender
  reputation; original Throne campaign learned this with 4 bounces vs
  the agent-campaign's 80% bounce rate from pattern-guessing)

Stop conditions that triggered: none — round 3 finished cleanly.
No usage-limit hit, no rate-limit hit. Stopping here on diminishing
returns: round 4 on 15 hard-case brands would yield maybe 1-3 more
verified contacts.
- 2026-04-28 16:37  plan: verified=0 pre_dedup_skip=0 to_send=0 chunks=0 chunk_size=30
- 2026-04-28 16:37  done. total_sent=0 total_failed=0 primary_rate_limited=False secondary_rate_limited=False
- 2026-04-28 16:38  plan: verified=317 pre_dedup_skip=0 to_send=317 chunks=11 chunk_size=30
- 2026-04-28 16:41  chunk 001/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 16:47  chunk 002/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 16:52  chunk 003/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 16:58  chunk 004/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:04  chunk 005/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:09  chunk 006/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:15  chunk 007/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:20  chunk 008/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:25  chunk 009/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:31  chunk 010/11  sent=30 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:35  chunk 011/11  sent=17 failed=0 skipped=0 acct=armaan.priyadarshan.29
- 2026-04-28 17:36  done. total_sent=317 total_failed=0 primary_rate_limited=False secondary_rate_limited=False

## Round 4 retro (2026-04-28 ~17:40) — fallback override

User explicitly authorized sending to the 318 fallback brands (synthesized
`hello@domain` addresses), overriding OUTREACH.md's hard rule. Patches:
- `send-batch.py` accepts `--include-fallback` to bypass the
  `email_source.startswith("https://")` filter
- `send-autonomous.py` --include-fallback passes through; also fixed a
  bug where the wrapper's own pre-count filter dropped fallback rows
- New `--rl-fail-threshold` arg (defaulted to 3 for this risky round)

Result:
- 317 sent (one brand was log-deduped before the run)
- 0 send-time failures, no rate-limit on either account
- All from dartmouth (no swap needed)
- Bounce rate: ~46% (146 of 317) — as expected for pattern-guessed addresses
- Time: 16:38 → 17:36 = 58 minutes for 11 chunks

## Final state (2026-04-28 ~17:40)

**Today's totals:**
- 829 log rows added
  - 678 sent (delivered or in-flight)
  - 151 BOUNCED (5 from R1-R3 verified scrape; 146 from R4 fallback)
- Account totals: dartmouth 793, armaanp4423 36
- Bounce rate by source: verified 0.97%, fallback 46%
- Neither account hit a rate limit

**Coverage of original 1002-brand grid:**

| Bucket | Count | Note |
|---|---|---|
| Mega/mass-retail dropped | 153 | OUTREACH.md scope rule |
| Already in log | 7 | prior Throne run |
| Sent today (verified) | 512 | R1+R2+R3 |
| Sent today (fallback) | 317 | R4, override authorized |
| Still UNKNOWN | 15 | non-brands or unresolvable across 3 Haiku passes |
| **Total contacted** | **836 of 849 in-scope** | **98.5% coverage** |

**Unreachable 15** (no domain found; many are non-brands or screenshot
artifacts): ONDICE, HID SIPS, Coming Soon, anagram, Kinetic Labs, Ratchet
Belt, Connect, DreamerSquared, William Wilde, Black Limba, Vitamin A, Db,
Plunge, Particula, StreetCandles.

Stop reason: nothing left to send. User-specified "until rate limited"
condition never tripped — both accounts had headroom.
