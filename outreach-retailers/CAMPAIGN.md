# Mid-Size Retailer Outreach — Day 1 Retrospective

**Window:** 2026-05-19 → 2026-05-21
**Sender:** `armaan.priyadarshan.29@dartmouth.edu` (single account, Workspace)
**Subject (initial):** `Stanford/Dartmouth Student Inquiry`

## Headline numbers

| Metric | Count |
| --- | --- |
| Total sends logged | 441 |
| Unique retailers / orgs touched | 85 |
| Bounces (DSN-confirmed, marked `BOUNCED`) | 31 |
| Real replies (non-auto) in last 30h window | ~2-3 |
| Auto-replies (OOO / automatic / delay) | 10 |
| Bulk follow-ups sent (2026-05-21) | 107 |
| Failed sends across the whole run | 0 |

Bounce rate ≈ 7%, dominated by Outdoor Play (8 sends across 9 pattern
guesses, all rejected) and a handful of out-of-date contacts at
Glossier/Grove/Fleet Feet/Foot Locker.

## Campaign shape

Forked from `outreach-brands-audit/` (single-brand DTC) with the audience
swapped to multi-brand retailers / marketplaces. Same no-scrape
architecture: emails are curated manually and pasted into the chat, the
script sends + logs + bounce-sweeps.

Operating mode this day was unusual: instead of preparing a `batch.csv`,
the operator pasted one address at a time and Claude sent directly via
the Python `send_one` helper, appending each successful send to
`outreach-log.csv` inline. Faster paste-and-send rhythm than the
documented orchestrator. The `batch.csv` flow still exists for bulk
imports.

## Template evolution

Three template versions across the campaign:

1. **YC/A16z pitch** (initial — 2026-05-19 through morning 2026-05-20)
   *"We're Stanford/Berkeley MET/Dartmouth students building in agentic
   commerce. We're interviewing with Y Combinator and would love to
   talk. Open to chat?"*
2. **Product-data pitch + VC social proof** (2026-05-20)
   *"...helping retailers enrich product data and reach millions of
   consumers using AI to discover and shop. We're working with brands
   valued over $300M+ and have received significant interest from VC
   firms like Y Combinator and Andreessen Horowitz. Free to talk this
   week?"*
3. **AI tooling + 10-min call** (2026-05-20)
   *"...working on AI tooling for retailers. ... whether retailers are
   currently prioritizing AI shopping agents as part of the customer
   experience. With that in mind, would you be open to a short 10
   minute call?"*
4. **Catalog audit offer** (2026-05-21, current)
   *"...helping specialty retailers take advantage of AI shopping.
   ...working with brands valued over $300M+ and leading shopping agent
   platforms. Happy to send a short report we compiled on your
   catalog."*

The body in `send-batch.py` is the current version (catalog audit). All
prior versions are reconstructable from `git log`.

## Subject evolution

1. `Stanford/Dartmouth Student Inquiry` — 2026-05-19 through morning 2026-05-21
2. `Dartmouth Student Inquiry - Referred by Roy Schmidt` — one-off batch
   of 4 referral sends on 2026-05-20 (Paradis Sport, Birdie and Claire,
   Perfect DD, Jilly Bing). Sent via in-memory `SUBJECT_TMPL` override
   so the file template wasn't touched.
3. `Stanford/Dartmouth Student Inquiry - thoughts on AI retail tools` —
   late 2026-05-20 into 2026-05-21
4. `Stanford Student Question - thoughts on AI retail tools` — current

Threading note: follow-ups must match the original subject the
recipient received (Gmail threads by subject + In-Reply-To). The
`send-followups.py` script reads each recipient's original message and
reuses its subject automatically.

## Email pattern discoveries

Observed per-retailer patterns (compiled into the brand-email-pattern
memory for future sessions):

| Retailer / Brand | Pattern | Notes |
| --- | --- | --- |
| Grove Collaborative | `first.last@grove.co` | `.co` TLD; 4 of 8 bounced |
| Fleet Feet | `first.last@fleetfeet.com` | 1 of 10 bounced |
| Road Runner Sports | `firstinitial+lastname@roadrunnersports.com` | Operator-stated, confirmed |
| Running Warehouse | first-name only @runningwarehouse.com | 2 of 3 bounced |
| Fit2Run | `first.last@fit2run.com` | 1 of 7 bounced |
| Foot Locker | `first.last@footlocker.com` | 1 of 4 bounced |
| The Warehouse Group (NZ) | first-name only @thewarehousegroup.co.nz | collision on `mark@`; second Mark sent as `mark.anderton@` |
| REI | `firstinitial+lastname@rei.com` | 9 sends, no bounces |
| Heartbreak Running | first-name only @heartbreak.run | `.run` TLD |
| Brooklyn Running Co | `firstlast@brooklynrunningco.com` (concat) | 1 of 2 bounced |
| Performance Running | first-name only @performancerunning.com | 1 of 2 bounced |
| Tortoise and Hare Sports | first-name only @tortoiseandharesports.com | clean |
| Marathon Sports | `first.last@marathonsports.com` | 1 of 6 bounced |
| Charm City Run | first-name only @charmcityrun.com | clean |
| Philadelphia Runner | `first+lastinitial@philadelphiarunner.com` | inferred from one example |
| Gearhead Outfitters | first-name only @gearheadoutfitters.com | clean |
| Dartmouth Coop | `firstinitial+lastname@dartmouthcoop.com` | single send |
| Simon Pearce | `first.last@simonpearce.com` | 1 of 7 bounced |
| Outdoor Play | unknown — all 9 patterns bounced | catch-all `customerservice@` used as fallback |
| Wilderness Sports | first-name only @wildernessportsinc.com | clean |
| Academy Sports | `first.last@academy.com` | clean |
| Tahoe Mountain Sports | `first.last@tahoemountainsports.com` (also `dave@` accepted) | both patterns work |
| Eastern Mountain Sports | `first.last@ems.com` with **short-form first name** | `david.barton@` bounced; `dave.barton@` worked |
| Dick's Sporting Goods | `first.last@dickssportinggoods.com` | clean |
| Etsy | `firstinitial+lastname@etsy.com` | 2 of 13 bounced |
| Best Buy | `first.last@bestbuy.com` | clean |
| Nordstrom | `first.last@nordstrom.com` | hyphenated last names preserve hyphen |
| Macy's | `first.last@macys.com` | clean |
| TJX | `first_last@tjx.com` (underscore!) | unusual separator |
| Backcountry | `first.last@backcountry.com` | clean |
| Sur La Table | `first.last@surlatable.com` | clean |
| Crate & Barrel | `firstinitial+lastname@crateandbarrel.com` | clean |
| Williams-Sonoma | `firstinitial+lastname@williams-sonoma.com` | hyphen in domain |
| Evo | `firstinitial+lastname@evo.com` | clean |
| L.L.Bean | `firstinitial+lastname@llbean.com` | clean |
| Sephora | `first.last@sephora.com` | clean |
| Bass Pro Shops | `firstinitial+lastname@basspro.com` | clean |
| Bath & Body Works | `firstinitial+lastname@bbwinc.com` | domain ≠ brand name |
| Patagonia | `first.last@patagonia.com` | clean |
| Worldwide Cyclery | first-name only @worldwidecyclery.com | clean |
| Excel Sports | first-name only @excelsports.com | clean |
| BG Indy | first-name only @bgindy.com | 2 of 3 bounced |
| Mike's Bikes | `first.last@mikesbikes.com` | 2 of 5 bounced |
| Christy Sports | `firstinitial+lastname@christysports.com` | single send |
| Stio | `firstinitial+lastname@stio.com` | clean |
| Paka Apparel | first-name only @pakaapparel.com | clean |
| American Giant | `firstinitial+lastname@american-giant.com` | first-name-only fallbacks also sent |
| Baltini | first-name only @baltini.com | 1 of 3 bounced |
| Portland Gear | first-name only @portlandgear.com | clean |
| Nespresso | `first.last@nespresso.com` | clean |
| Trek Bikes | `first_last@trekbikes.com` (underscore) | 1 of 5 bounced |
| Tactics | `first+lastinitial@tactics.com` | 1 of 3 |
| Dick's Sporting Goods | `first.last@dickssportinggoods.com` | clean |
| Skims | `first.last@skims.com` | from earlier brand-audit |
| ALC | `first+lastinitial@alcltd.com` | 1 of 3 bounced |
| Movado Group | `firstinitial+lastname@movadogroup.com` | clean |
| VF Corp | `first_last+digit@vfc.com` | digit disambiguator for duplicates |
| ONE/SIZE Beauty | `firstinitial+lastname@onesizebeauty.com` | clean |
| Fabletics | `firstinitial+lastname@fabletics.com` | clean |
| Ritual | `first.last@ritual.com` | clean |
| Nike | `first.last@nike.com` | single send |
| PacSun | `firstinitial+lastname@pacsun.com` | clean |
| Buck Mason | `firstinitial+lastname@buckmason.com` | clean |
| Leset | first-name only @leset.com | single send |
| easyJet | `first.last@easyjet.com` | single send |
| Dr Squatch | `first.last@drsquatch.com` | single send |
| eBay | `firstinitial+lastname@ebay.com` | single send |
| L'Oreal | `first.last@loreal.com` (and `firstinitial+lastname@us.loreal.com`) | clean across ~30 sends |
| Haleon | `first.last@haleon.com` (rare middle-initial variant: `first.x.last@`) | clean |
| Moon Juice | `first.last@moonjuice.com` | clean |
| Love Wellness | `firstlast@lovewellness.com` (concat) | clean |

## The Outdoor Play story

Sent 8 first-name-only addresses (queena, andrew, stacey, jason, erika,
brian, sarissa, kaleb @outdoorplay.com). All 8 bounced with
`550 5.1.1 The email account that you tried to reach does not exist`.

Then attempted 9 patterns against Queena Brown to find the right format:
`queena@`, `qbrown@`, `queena.brown@`, `queenab@`, `queenabrown@`,
`brown@`, `q.brown@`, `queena_brown@`, `queena-brown@`. **All 9
bounced** with the same `No such user` error. Domain is hosted on Google
Workspace with MX records intact — they just reject anything that
doesn't exactly match an active account. Possible explanations: Queena
isn't there anymore, the name in our source data is wrong, or they use
something like nicknames / employee numbers we couldn't guess.

Stopped after 17 total bounces to that domain. Sent the catch-all
`customerservice@outdoorplay.com` instead as the final attempt.

Lesson: when a domain rejects all reasonable patterns, the
employee-list source is likely stale or wrong — not the pattern.

## Operating mode lessons

- **Paste-and-send beats batch.csv for ad-hoc outreach.** The operator's
  rhythm of pasting one name + retailer at a time and Claude
  constructing the address from observed patterns worked well. The
  bottleneck was Claude's send latency, not the operator's.
- **Inline pattern memory matters.** Persisting per-retailer patterns
  to the `reference-brand-email-patterns` memory file (across sessions)
  meant Claude didn't re-learn patterns. Skims, Spanx, Glossier from the
  earlier brand-audit campaign were re-used.
- **The bounce sweep is essential.** Without it, the CSV becomes a
  pile of optimistic "sent" entries that misrepresent reachability. Run
  it at least once before any follow-up cycle.
- **`in:anywhere` beats `in:sent` for harvesting.** Some bounces got
  silently trashed without DSN matches. Searching only `in:sent` missed
  6 retailer sends; `in:anywhere` + filter-by-`from:` recovered them.

## Follow-up day-1

107 follow-ups went out on 2026-05-21 to all 2026-05-19 retailer sends
that hadn't received a real reply (auto-replies included as still
needing follow-up). Each landed as a true reply via
`--reply-to-message-id`, so Gmail threaded them into the original
conversation and the team CC was preserved via `--reply-all`.

Send rate: ~107 sends in ~4 minutes with 1.5-3s jitter, 0 failures, 0
new bounces during the run.

Skipped (correctly):
- 22 originally-2026-05-19 sends that had already bounced
- 1 personal-domain send (`@gmail.com` / `@yahoo.com` etc.)
- 3 real-reply recipients (truly engaged, not autoresponders)

## What's pending

- 2026-05-20 and 2026-05-21 sends haven't been followed up yet. Bump
  `TARGET_DATE` in `send-followups.py` to do them.
- Real replies need manual triage — the CSV doesn't track an
  `replied=true` status. Could add a `replied` column or a separate
  `replies.csv`.
- Cross-campaign dedup (someone in retailers may also be in
  brand-audit) is still manual.
- Outdoor Play needs a different source for contact discovery (their
  Workspace rejects pattern guessing entirely).
