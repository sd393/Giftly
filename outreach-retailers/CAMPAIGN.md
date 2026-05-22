# Mid-Size Retailer Outreach — Campaign Retrospective

**Window:** 2026-05-19 → 2026-05-22 (active)
**Sender:** `armaan.priyadarshan.29@dartmouth.edu` (single account, Workspace)
**Current subject:** `Stanford Student Question - thoughts on AI retail tools`
**Current template version:** v5 (with `{name}` + `{company}` substitution)

This document is the canonical retrospective of the retailer campaign.
If a new Claude Code session is asked to keep working on this campaign,
read this file end-to-end before doing anything else — it captures the
operating mode, template evolution, per-retailer email patterns, and
one-off overrides that are not obvious from the scripts alone.

## Headline numbers

| Metric | Count |
| --- | --- |
| Total sends logged | 543 |
| Unique retailers / orgs touched | ~100 |
| Bounces (DSN-confirmed, marked `BOUNCED`) | 52 |
| Bulk follow-ups sent on 2026-05-21 (covering 2026-05-19 sends) | 107 |
| Bulk follow-ups sent on 2026-05-22 (covering 2026-05-20 sends) | 230 |
| Failed sends across the whole run | 0 |

Per-day breakdown (approximate, from `outreach-log.csv` `date_sent`):

| Day | Sends |
| --- | --- |
| 2026-05-19 | 130 |
| 2026-05-20 | 252 |
| 2026-05-21 | 149 |
| 2026-05-22 | 12 (so far) |

Bounce rate ≈ 10%, dominated by Outdoor Play (8 + 9 pattern-hunt sends,
all rejected — see story below) and out-of-date contacts at Glossier,
Grove, Fleet Feet, Foot Locker.

## Campaign shape

Forked from `outreach-brands-audit/` (single-brand DTC) with the audience
swapped to multi-brand retailers / marketplaces. Same no-scrape
architecture: emails are curated manually and pasted into the chat, the
script sends + logs + bounce-sweeps.

**Operating mode** through most of the campaign: the operator pasts a
name (and sometimes retailer) into the chat, Claude derives the email
from the active retailer's pattern, sends via the Python `send_one`
helper, and appends each successful send to `outreach-log.csv` inline.
This paste-and-send rhythm is significantly faster than the documented
`batch.csv` orchestrator for ad-hoc outreach. The `batch.csv` flow still
exists for bulk imports.

## Template evolution

Five template versions (see git log on `send-batch.py` for the exact
diffs):

1. **YC/A16z pitch** (2026-05-19 through morning 2026-05-20)
   *"We're Stanford/Berkeley MET/Dartmouth students building in agentic
   commerce. We're interviewing with Y Combinator and would love to
   talk. Open to chat?"*
2. **Product-data pitch + VC social proof** (2026-05-20)
   *"...helping retailers enrich product data and reach millions of
   consumers using AI to discover and shop. ... working with brands
   valued over $300M+ and have received significant interest from VC
   firms like Y Combinator and Andreessen Horowitz. Free to talk this
   week?"*
3. **AI tooling + 10-min call** (2026-05-20)
   *"...working on AI tooling for retailers. ... whether retailers are
   currently prioritizing AI shopping agents as part of the customer
   experience. ... would you be open to a short 10 minute call?"*
4. **Catalog audit offer** (2026-05-21)
   *"...helping specialty retailers take advantage of AI shopping.
   ...working with brands valued over $300M+ and leading shopping agent
   platforms. Happy to send a short report we compiled on your
   catalog."*
5. **AI-curiosity + 10-min call + fallback ask** (2026-05-21, current)
   *"We're Stanford/Dartmouth students curious how {company} is thinking
   about AI, given 50 million people now shop with ChatGPT daily. Would
   you be open to a quick 10-minute call? If not, we would appreciate
   even a one-sentence response with your thoughts on how retailers are
   improving their visibility with AI."*

**v5 introduces substitution.** Earlier templates were literal strings;
v5 uses `{name}` and `{company}` placeholders rendered by
`render_body()` in `send-batch.py`. Empty-name → greeting collapses to
`Hi,`; empty-company → defaults to `your company`. See "Template
substitution" below.

## Subject evolution

1. `Stanford/Dartmouth Student Inquiry` — 2026-05-19 through 2026-05-21
2. `Dartmouth Student Inquiry - Referred by Roy Schmidt` — one-off batch
   of 4 referral sends on 2026-05-20 (Paradis Sport, Birdie and Claire,
   Perfect DD, Jilly Bing). Sent via in-memory `SUBJECT_TMPL` override
   so the file template wasn't touched.
3. `Stanford/Dartmouth Student Inquiry - thoughts on AI retail tools` —
   late 2026-05-20 into 2026-05-21
4. `Stanford Student Question - thoughts on AI retail tools` — current,
   from 2026-05-21 onward
5. `Dartmouth Student Inquiry` — one-off for `kathryn@aillea.com`
   (2026-05-21). Operator requested Dartmouth-only framing for that
   single send; subject + body both overridden in-memory.

**Threading note for follow-ups:** Gmail threads by Subject +
In-Reply-To / References. The `send-followups.py` script reads each
recipient's original message via gmail metadata and reuses its actual
subject automatically — so subject changes across the campaign don't
break threading.

## Template substitution (v5+)

`send-batch.py` exposes `render_body(name, company) -> (plain, html)`
which interpolates the two placeholders into `BODY_TMPL` and
`BODY_HTML_TMPL`. The HTML version's first `<p>` has
`style="margin-top:0"` to kill Gmail's default top margin (without it,
the rendered email has a visually empty line above the greeting — a
fix added 2026-05-21 after the operator flagged the leading whitespace).

`send_one(email, *, dry_run, name="", company="")` takes optional name
and company kwargs and calls `render_body()` internally. The CSV batch
loop in `main()` passes `name=r.get("name")` and `company=r.get("retailer")
or r.get("brand")`.

For the paste-and-send rhythm, Claude calls `send_one` directly with
`name=` and `company=` filled in based on the active retailer context.

## Per-retailer email pattern discoveries

Observed patterns (also persisted in the
`reference-brand-email-patterns` memory file across sessions). When an
operator pastes a name only, the active retailer's pattern is applied;
when they paste an email, that's used verbatim and treated as a new
data point for the pattern table.

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
| Pinterest | `firstinitial+lastname@pinterest.com` | clean |
| Bluemercury | `firstinitial+lastname@bluemercury.com` | clean |
| Violet Grey | `first.last@violetgrey.com` | clean |
| Harvey Nichols | `first.last@harveynichols.com` | clean |
| Nutrafol | first-name only @nutrafol.com | clean |
| Dr. Bronner's | first-name only @drbronner.com, with collision fallback to `firstinitial+lastinitial@` (e.g. `michaelb@` for Michael Bronner alongside `michaelm@` for Michael Milam) | first-name-only is primary |
| Kosas | `first.last@kosas.com` | clean |
| The Honest Company | `firstinitial+lastname@thehonestcompany.com` | clean |
| Beauty Heroes | first-name only @beauty-heroes.com | hyphen in domain |
| LovelySkin | `first.last@lovelyskin.com` | clean |
| Beautylish | first-name only @beautylish.com | `john@` and `jon@` are different mailboxes |
| Ulta | `firstinitial+lastname@ulta.com` | hyphenated last names preserved (`abayer-thomas@`) |
| Gymshark | `firstinitial.lastname@gymshark.com` (dot, single-letter prefix) | unusual format |
| YoungLA | first-name only @youngla.com | clean |
| Aillea | first-name only @aillea.com | single Dartmouth-only one-off send (see overrides) |

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

**Lesson:** when a domain rejects all reasonable patterns, the
employee-list source is likely stale or wrong — not the pattern.

## One-off send overrides

When a single send needs a different subject/body without modifying the
file template, override the module constants in-memory inside the
inline Python wrapper, before calling `send_one`. The file is unchanged
because each `python3 - <<PY` invocation gets a fresh interpreter.

**Used twice in this campaign:**

1. **Roy Schmidt referrals** (2026-05-20, 4 sends — sarah@paradissport.com,
   julie@birdieandclaire.com, akim@perfectdd.com,
   elenor@jillybing.com). Overrode `m.SUBJECT_TMPL = 'Dartmouth Student
   Inquiry - Referred by Roy Schmidt'` only.
2. **Aillea Dartmouth-only** (2026-05-21, kathryn@aillea.com). Overrode
   both `m.SUBJECT_TMPL = 'Dartmouth Student Inquiry'` and the
   `BODY_TMPL` / `BODY_HTML_TMPL` to a Dartmouth-only variant (no
   Stanford reference).

Both are tagged in `outreach-log.csv` `notes` with what was overridden.
The `send-followups.py` script skips Roy-Schmidt-referral rows by
checking the notes field for `roy schmidt` — this is intentional
because those recipients should not get the standard follow-up body.

## Operating mode lessons

- **Paste-and-send beats batch.csv for ad-hoc outreach.** The operator's
  rhythm of pasting one name + retailer at a time and Claude
  constructing the address from observed patterns worked well.
- **Substitution is worth the small refactor.** Going from a fixed
  string body to `{name}` / `{company}` was a high-value change for
  perceived send quality. The empty-value fallbacks (`Hi,` /
  `your company`) keep it safe when source data is incomplete.
- **Inline pattern memory matters.** Persisting per-retailer patterns
  to the `reference-brand-email-patterns` memory file (across sessions)
  meant Claude didn't re-learn patterns. Skims, Spanx, Glossier from
  the earlier brand-audit campaign were re-used.
- **The bounce sweep is essential.** Without it, the CSV becomes a
  pile of optimistic "sent" entries that misrepresent reachability. Run
  `process-bounces.py --since 60h` before any follow-up cycle.
- **`in:anywhere` beats `in:sent` for harvesting.** Some bounces got
  silently trashed without DSN matches. Searching only `in:sent` missed
  6 retailer sends; `in:anywhere` + filter-by-`from:` recovered them.
- **HTML `<p>` margins create visual lead whitespace.** Gmail renders
  `<p>` with default top-margin even when the raw body has no leading
  newline. Fix: `<p style="margin-top:0">` on the first paragraph.
- **First-name collisions are real.** Dr. Bronner's had `michael@` taken
  by Michael Bronner; Michael Milam went out as `michaelm@`. Similar
  collision at The Warehouse Group (`mark@`). When a first-name
  pattern collides, fall back to first+lastinitial or first.last.
- **Don't drop names from pastes.** When a paste contains both an email
  and a name (e.g. `jgoldberg@bluemercury.com jenna goldberg`), use the
  name in the greeting. See `feedback-paste-format` memory.

## Follow-up day 1 (2026-05-21)

107 follow-ups went out to all 2026-05-19 retailer sends that hadn't
received a real reply (auto-replies included as still needing follow-up).
Each landed as a true reply via `--reply-to-message-id`, so Gmail
threaded them into the original conversation and the team CC was
preserved via `--reply-all`.

Send rate: ~107 sends in ~4 minutes with 1.5-3s jitter, 0 failures, 0
new bounces during the run.

Skipped (correctly): 22 bounced sends, 1 personal-domain send, 3
real-reply recipients.

## Follow-up day 2 (2026-05-22)

230 follow-ups went out to all 2026-05-20 retailer sends that hadn't
received a real reply. Used the bumped `TARGET_DATE = '2026-05-20'` in
`send-followups.py`. Same script, same shape.

Send rate: ~230 sends in ~9 minutes with 1.5-3s jitter, 0 failures.

Skipped (correctly): 9 bounced sends, 4 Roy-Schmidt-referral sends, 1
personal-domain send, 1 real-reply recipient.

**Operating pattern for future follow-up days:** bump `TARGET_DATE` at
the top of `send-followups.py`, run a fresh `process-bounces.py
--since 60h` sweep first, dry-run the script to confirm the target
count looks right, then send for real. The CSV's `notes` column gains a
`followed_up <date>` tag for each follow-up, preventing accidental
double-follow-ups if the script is re-run with the same `TARGET_DATE`
(the gmail message ID still resolves correctly, but the operator can
filter visually).

## What's pending

- 2026-05-21 and 2026-05-22 sends haven't been followed up yet. When
  ready, bump `TARGET_DATE` in `send-followups.py`.
- Real replies need manual triage — the CSV doesn't track an
  `replied=true` status. Could add a `replied` column or a separate
  `replies.csv`.
- `TARGET_DATE` is hard-coded; could be a CLI arg for cleaner
  re-runs. Small refactor.
- Cross-campaign dedup (someone in retailers may also be in
  brand-audit) is still manual.
- Outdoor Play needs a different source for contact discovery (their
  Workspace rejects pattern guessing entirely).
