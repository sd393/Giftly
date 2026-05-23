# Giftly Midsize Merchant Outreach Playbook

Comprehensive playbook for the `outreach-merchants/` campaign as of 2026-05-23.
This document captures **every requirement the operator gave, every design
decision, every gotcha discovered, every failure mode learned the hard way**,
and the current shape of every pipeline stage. Read this end-to-end before
touching any script.

---

## TABLE OF CONTENTS

1. [Audience](#audience)
2. [Pitch + template](#pitch--template)
3. [Hard rules](#hard-rules)
4. [Pipeline overview](#pipeline-overview)
5. [Stage 1 — Brand discovery](#stage-1--brand-discovery)
6. [Stage 2 — Domain verification](#stage-2--domain-verification)
7. [Stage 3 — Staff discovery](#stage-3--staff-discovery)
8. [Stage 4 — Email pattern discovery + verification](#stage-4--email-pattern-discovery--verification)
9. [Stage 5 — Cross-source dedup](#stage-5--cross-source-dedup)
10. [Stage 6 — Send](#stage-6--send)
11. [Stage 7 — Bounce sweep](#stage-7--bounce-sweep)
12. [Files reference](#files-reference)
13. [Failure modes learned](#failure-modes-learned)
14. [Current state (2026-05-23)](#current-state-2026-05-23)

---

## AUDIENCE

### Iteration 1 (initial, deprecated): Indie Shopify DTC $1-5M MRR
The first design targeted small-indie single-brand DTC merchants on Shopify in
the $1-5M MRR band. Sub-vertical for the 10-person test was indie skincare.
This was abandoned mid-session after the 5-person test bounced 3 of 5 (catchall
post-bounce on indie domains).

### Iteration 2 (current): Midsize merchants ($10M-$200M roughly)
Operator pivoted to **midsize merchants** because:
- Indie brands hide their leadership; staff-discovery yields ~1 founder per brand max
- 5-10 people per company target is unachievable at the indie band
- Midsize brands have layered org charts (CEO → VPs → Directors) → multiple senior targets per brand
- Catchall MX is rarer at midsize (they run real Workspace/Outlook tenants with pre-created aliases)

**Hard exclusions** (do NOT include even if they surface):
- Public companies (Etsy, Wayfair, Casper, Allbirds, Hoka, Olaplex, Stitch Fix, Brilliant Earth, etc.)
- Acquired/mega-co subsidiaries (Tom Ford, Diptyque, Le Labo — LVMH/Estée Lauder; Bonobos — Walmart; Honest Co; Hims-tier IPOs)
- Anything with a Wikipedia article (proxy for "too big")
- Anything with > $500M valuation or > 500 employees
- Multi-brand retailers (those go in `outreach-retailers/` not here)
- Pure marketplaces (eBay shape)
- Pre-revenue / hobby brands

### Sweet spot
- Revenue $10M-$200M
- ~50-500 employees
- Founded ~2014-2022
- Founder-led OR private-equity-backed mid-market
- Real leadership team with CMO/VP/Director layer
- Email at Workspace/Outlook with pre-created aliases
- Single brand DTC on Shopify (or Shopify Plus)

---

## PITCH + TEMPLATE

### v5 template — used verbatim, no edits per send

- **Subject** (exact, never modified):
  `Stanford Student Question - thoughts on AI retail tools`

- **Body** (plain text, with `{name}` and `{company}` substitution):
  ```
  Hi {first-name},

  We're Stanford/Dartmouth students curious how {company} is thinking about AI, given 50 million people now shop with ChatGPT daily.

  Would you be open to a quick 10-minute call?

  If not, we would appreciate even a one-sentence response with your thoughts on how retailers are improving their visibility with AI.

  Thanks,
  Armaan
  ```

- **HTML mirror**: same content, first `<p>` has `style="margin-top:0"` to kill
  Gmail's default top-margin (otherwise greeting visually sits below an empty line).

- **{name} substitution**: first word of the person's name (Jordan Nathan → "Jordan").
  Empty name → greeting collapses to `Hi,`.

- **{company} substitution**: clean brand display name (e.g. "Caraway Home", not
  the storefront URL). Empty company → `your company` fallback.

### CCs (every send)
Every outbound CCs the team:
- `samarjit.deshmukh.29@dartmouth.edu`
- `ethanpzhou@berkeley.edu`
- `shamitd@stanford.edu`

This is hardcoded in `send-batch.py:CC_RECIPIENTS`. Operator can override per-batch
by editing the constant or asking for a one-off skip.

### Hygiene
- No em dashes
- No exclamation marks
- No buzzwords, no flattery
- Plain language
- No emojis
- Same hygiene as all other Giftly outreach campaigns

---

## HARD RULES

Below are every hard rule the operator stated, verbatim where possible. These
are NOT defaults; they override anything else.

1. **NO ROLE ADDRESSES.** Ever. No `info@`, `hello@`, `support@`,
   `partnerships@`, `press@`, `sales@`, `contact@`, `admin@`, `marketing@`,
   `team@`, `office@`, `careers@`, `hr@`, `legal@`, etc. The verifier has 89
   role-shaped local parts hardcoded in `verify-staff.py:ROLE_LOCAL_PARTS` and
   `smtp-verify.py:HARD_BLOCK_LOCAL`. `build_email()` refuses to construct a
   role-shaped local-part even if the pattern would generate one.

   Reason: role addresses route to customer-service contractors who don't
   forward to the senior people we're pitching. The pitch never reaches its
   target. (Operator quote: "no shitty hello@ or info@ emails anywhere in
   this entire pipeline.")

2. **NO BOUNCES.** Every email must be SMTP-verified deliverable before
   sending. The verifier MUST detect catchall MX domains first (via sentinel
   probe) and skip the whole brand if catchall — because catchall servers
   accept the RCPT TO probe (250) then post-bounce with 550 DSN when
   actually delivering to a nonexistent local-part.

   Failure mode: 2026-05-22 the operator made me override `--catchall-policy`
   to `send-named`. All 3 catchall sends bounced within 15 min. Operator's
   inbox flooded. Catchall-policy default is permanently `skip`.

3. **NAMED PEOPLE ONLY.** No role addresses, no general inboxes, no
   "let's send to the brand's contact form." Every send goes to a real
   human whose name is in the To field.

4. **SENIOR + RELEVANT TO ECOMM/MARKETING.** Operator quote: "they should all
   be extremely senior or relevant ecommerce and marketing roles." Drop:
   accounting, finance, ops, supply chain, design (unless brand director),
   product development engineering, junior IC titles, social media managers.

   Keep: CEO, founders, CMO, COO, EVP, SVP, VP, Director (any senior title),
   Head of (marketing/brand/ecommerce/growth/social), Senior Manager (marketing
   subset only).

5. **5-10 PEOPLE PER COMPANY (target).** Operator wants multiple senior staff
   per brand. Send to a senior cluster. If a brand only has 1-2 senior people
   findable, the brand is probably too small; consider dropping or accept the
   small batch for that brand.

6. **CROSS-CAMPAIGN DEDUP.** Operator quote: "ensure you deduplicate the
   merchants/contacts against all the targets from previous outreach campaigns
   and my email." This means:
   - Skip any candidate already in any sibling `outreach-*/outreach-log.csv`
   - Skip any candidate the operator has personally corresponded with via
     either of their gog-authed gmail accounts
     (`armaan.priyadarshan.29@dartmouth.edu`, `armaanp4423@gmail.com`)
   - Skip anything in `outreach-merchants/cold-call-list.csv` (subagent output)

7. **NO DOMAIN GUESSWORK.** Operator quote: "i dont want any guesswork
   involved in this... you can search up a company on google and pretty easily
   find what the correct domain is supposed to be." Domain verification via
   Google top-organic search (not chain-of-evidence reasoning).

8. **NO V5 TEMPLATE EDITS.** Subject and body locked. For genuine one-off
   needs (referral pitch, Dartmouth-only framing), override module constants
   in-memory inside an inline Python wrapper — never edit the file template.

---

## PIPELINE OVERVIEW

```
midsize-500.csv (initial guess list, my knowledge + categories)
    │
    ▼
verify-domain.py — Google top-organic check per brand
    │  → midsize-500-clean.csv  (391 confirmed + 86 corrected + 22 reviewed)
    ▼
trimmed.csv (next batch of N brands to process)
    │
    ▼
discover-staff.py — LinkedIn /company/<slug>/people/ scrape via headed Chrome
    │  → contacts.csv (named + senior + relevant only)
    ▼
verify-staff.py — SMTP RCPT TO with pattern-locking + prefer-shortest-alias
    │  → verified.csv (deliverable named emails)
    ▼
send-batch.py — v5 template, CCs team, log to outreach-log.csv
    │  → outreach-log.csv (canonical send log, append-only)
    ▼
process-bounces.py — 30 min later, mark BOUNCED rows
```

The orchestrator `run-campaign.sh <account>` chains all stages. Stages are
idempotent — `--skip-source --skip-discover` allows resuming.

---

## STAGE 1 — BRAND DISCOVERY

### Source 1: `midsize-500.csv` (operator-curated list, manual)
500 midsize merchants compiled by me from training-data knowledge across 87
categories (beauty, apparel, home, food, supplements, etc.). Operator approved
this list 2026-05-22. Stored as `midsize-500.csv` (brand, domain, category).

Initial domain guesses were sourced from my memory and were NOT reliable —
needed Stage 2 verification.

### Source 2: `cold-call-list.csv` (subagent output, indie)
228 indie skincare/clean-beauty Shopify brand websites compiled by a
general-purpose subagent on 2026-05-22 from Petit Vour archives, Beauty
Heroes brand directory, Indie Beauty Expo 2024, editorial roundups. Used
as backup source for indie batches, NOT the primary midsize flow.

### Source 3: `source-publicwww.py` (programmatic, fallback)
PublicWWW (publicwww.com) — search engine for HTML/HTTP-header source code.
Run via the gstack `browse` binary because PublicWWW serves a JS shell to
plain `requests`. Free tier shows ~5 visible URLs per query before gating;
multiple narrow keyword queries aggregate to ~50 raw candidates → ~20 after
filter. Used originally for the indie batch; now legacy for midsize.

---

## STAGE 2 — DOMAIN VERIFICATION

### `verify-domain.py` — Google top-organic check

Operator's exact direction: "search up a company on google and pretty easily
find what the correct domain is supposed to be."

Algorithm per brand:
1. Navigate Google in the **headed Chromium** (NOT headless — Google captcha-
   flags headless on the 2nd request) to `https://www.google.com/search?q=<brand_name>`
2. Wait 3s (rate-limit budget)
3. Extract the FIRST organic result's domain via JS:
   - Skip ad cards (`[data-text-ad]`, `[aria-label*="Sponsored"]`)
   - Skip Google internal links (`google.com/*`)
   - Take the first `<a href="https://...">` with visible text length ≥ 3
4. Normalize: lowercase, strip `www.` via `removeprefix` (NOT `lstrip("www.")` —
   that strips individual chars `w`/`.` and corrupts domains starting with `w`)
5. Compare to my guessed domain → match=yes|no|unclear

### Classifier outputs
- **yes**: guess and Google match exactly OR one is a subdomain of the other
- **no**: different domains
- **unclear**: Google returned no organic result

### Buckets after run
- **google-confirmed**: 391 of 500. Guess was right.
- **google-corrected**: 86 of 500. Guess was wrong; use Google's domain. Common
  patterns: `forhims.com → hims.com`, `getroman.com → roman.com`,
  `onequince.com → quince.com`, `the-sleeper.com → sleeper.com`.
- **manual-review-needed**: 22 of 500. Google returned a noise domain
  (instagram.com, en.wikipedia.org, amazon.com, imdb.com, reddit.com,
  translate.google.com, ods.od.nih.gov). The brand's site usually still
  exists at the guessed domain; Google just ranked their social/wiki
  higher in SERP for name-collision reasons (e.g. "Buffy" returns
  wikipedia for Buffy the Vampire Slayer).

### Operator overrides applied 2026-05-23
- `Dyne` (dyne.life): DROPPED — operator confirmed dead URL.
- `Vinebox`: corrected to `vinebox.com` (script mis-bucketed it).
- `Vitamin A Swim`, `Tortuga Backpacks`: confirmed as-guessed.

### Output: `midsize-500-clean.csv`
499 brands total (Dyne dropped). Columns: brand, domain, category, source.

### Critical implementation notes
- Use `removeprefix("www.")` not `lstrip("www.")`. `lstrip` strips any leading
  characters from the set `{w, ., w}` not the string. `"wearpact.com".lstrip("www.")`
  → `"earpact.com"`. Affected 7 rows before the fix.

---

## STAGE 3 — STAFF DISCOVERY

### The flow (operator's manual method, automated)

Operator's exact direction:
> "the way I did it as a human was searching the name of the company on google
> and going to the appropriate link. after that I usually look at the recommended
> people on that individuals profile and go from there"
>
> "on company people page you can search employees by title"

Workflow:
1. **Open headed Chrome** via `/connect-chrome` skill — launches GStack Browser
   (Chromium with the gstack sidebar extension) on port 34567. Operator logs into
   LinkedIn once in this window.
2. **Navigate to LinkedIn company People tab**:
   `https://www.linkedin.com/company/<slug>/people/?keywords=<query>`
3. **Scroll to load profile cards** (3-4 scrolls, 1s each between)
4. **Extract from card previews** — each card shows name + headline + current
   company in the snippet. No need to click into each profile.
5. **Filter to senior + relevant** roles only (see KEYWORD TIERS below)
6. **Drop false positives**: VCs, advisors, ex-employees who haven't updated
   LinkedIn (Connor Dault was at Caraway as CMO, now at Gruns — his Google
   snippet still shows Caraway but his current employer is Gruns).
7. Build `contacts.csv` with: domain, brand, name, title, source_url, notes.

### LinkedIn auth: use `/connect-chrome`, NOT cookie injection
- Cookie injection via `setup-browser-cookies` got LinkedIn-flagged on the very
  first `/company/<slug>/people/` request in this session (HTTP 429), despite
  the operator having Premium. Premium does NOT exempt anti-bot detection.
  Anti-bot flags fingerprint mismatch between injected cookies and the
  Playwright headless browser running them.
- `/connect-chrome` instead controls a real visible Chromium with the gstack
  extension installed. Same fingerprint LinkedIn already trusts. Operator
  logs in once; I drive from there.

### Keyword tiers (memory: `feedback_linkedin_keyword_tiers`)
- **Midsize** (`/people/?keywords=<term>`): `vp`, `head`, `chief`, `director`,
  `ecommerce`, `marketing`, `growth`, `brand`, `product`
- **Indie** (< 30 employees): `owner`, `founder`, `co-founder`, `co-owner`,
  `creator`, `maker` — plus midsize set as backup
- Indie brands don't have a CMO/VP layer. The founder IS the CMO. Use the
  right keyword set per company size band.

### What "senior + relevant" means (operator's exact criterion)
Operator quote: "they should all be extremely senior or relevant ecommerce and
marketing roles."

KEEP:
- Founder, Co-Founder, CEO
- CMO, COO, CRO, CCO, CDO
- President, EVP, SVP, VP (any function)
- Senior Director, Director (marketing, growth, brand, ecommerce, social,
  product development for a DTC brand)
- Head of (marketing, brand, ecommerce, growth, social, product)
- Associate Director (only if marketing/brand/growth/lifecycle/influencer)
- For indies: Owner, Maker, Creator
- CX Director / VOC roles (consumer-facing senior)

DROP:
- Accounting, Finance Manager, Finance Systems
- Art Director (design, not marketing)
- Sr Accounting Manager / Senior Manager (non-marketing)
- Product Marketer (without Director title — too junior)
- Creative Strategist, Sr Editor, Designer (too junior)
- Social Media Manager (too junior)
- Engineering / Digital Product (back-end)
- Operations, Supply Chain, Distribution (unless Director with
  ecomm/operations crossover and brand-relevant)
- Retail Lead, Wholesale Lead (sales operations, not marketing)
- Vague headlines without a title ("Bringing a new category to life")

### `discover-staff.py` extraction notes
- Uses headed-Chromium `/connect-chrome` session
- For each domain in `trimmed.csv`, hits `/company/<slug>/people/?keywords=<kw>`
  for each keyword in the appropriate tier
- Extracts card preview text per profile link
- Filters by senior-role regex + drops obvious false positives (VCs at
  unrelated firms, ex-employees if their headline names a different company)
- Outputs `contacts.csv` with columns: domain, brand, name, title,
  source_url, notes

### Tricky-name detector
`is_tricky_name()` in `verify-staff.py` flags names that need explicit SMTP
probing instead of trusting the locked pattern:
- 3+ word names (Maria del Carmen)
- Hyphenated last names (Smith-Jones)
- Apostrophes (O'Brien)
- Non-Latin characters
- Short all-caps tokens (KoL, EJ) — likely initials/nicknames

---

## STAGE 4 — EMAIL PATTERN DISCOVERY + VERIFICATION

### Operator's exact direction for verification
> "the thing is how it should work, is that you should probe a person guessing
> patterns until you get one that works. then that pattern should be applied
> to the rest of them and you don't necessarily have to verify unless its a
> tricky one. use my empirical ranking as reference but keep guessing
> variations if none of those work."

### `verify-staff.py` algorithm per brand

**Step 1: Sentinel probe for catchall detection**
- Probe `donotreply-bot-check-x9z7q3a1<seconds>@<domain>` against the brand's
  MX server (looked up via `dig MX`).
- `250` → domain is CATCHALL → drop the whole brand. Per Hard Rule #2.
- `550` → domain is HONEST → continue.
- ERROR / no MX → UNREACHABLE → drop the whole brand.

**Step 2: Pattern discovery on first contact (then second if first fails)**
- Probe ALL patterns in `PATTERN_ORDER + EXOTIC_PATTERNS` (13 total):
  ```
  PATTERN_ORDER (empirical-ranked):
    first.last       (~40% of brands)
    flast            (~27% — firstinitial+lastname)
    first            (~26% — single-token, indie-skew)
    firstlast        (~2% — concat)
    first_last       (~4% — underscore, TJX/Trek/VF Corp)
    first+lastinitial (~2%)

  EXOTIC_PATTERNS (fallback if standard 6 fail):
    first-last        (hyphen)
    last.first        (reversed)
    lastfirst         (reversed concat)
    lastinitial.first (Gymshark single-letter+dot)
    first.lastinitial
    lastinitial+first (Orvis REVERSED — perkinss for Simon Perkins)
  ```
- Collect EVERY pattern that returns 250 (deliverable).
- **Pick the SHORTEST verified local-part as the locked pattern.**

**WHY SHORTEST WINS** (operator caught this 2026-05-23):
> "your email is wrong bro. the true one is jordan@carawayhome.com. how did
> that happen?"

Workspace/Outlook tenants commonly create multiple aliases per employee.
Caraway has `jordan@`, `jordan.nathan@`, AND `jnathan@` all delivering to the
same mailbox. The shortest is the PRIMARY (what shows in the person's email
signature, CRM, vCard). Longer ones are aliases. Sending to an alias delivers
but feels off — the To field doesn't match how the recipient identifies
themselves.

Original buggy logic stopped at the first VALID and locked `first.last`.
Fixed logic probes all + sorts by local-part length ascending + picks the
shortest. Memory: `feedback_pattern_pick_shortest`.

**Step 3: Apply locked pattern to remaining people**
- For each remaining contact at the brand:
  - Generate locked-pattern email via `build_email()`
  - `build_email()` refuses to construct role-shaped local parts even when
    the pattern would yield one (e.g. a one-name founder called "Hello"
    would yield `hello@` under pattern=first; rejected)
  - If `is_tricky_name(person)` → probe SMTP explicitly:
    - 250 → keep
    - 550 → drop
    - ERROR/TEMP → drop with notes
  - If not tricky → TRUST the pattern, no probe, write to verified.csv

**Step 4: Cross-source dedup at every probe**
- Drop any candidate email that's in the sibling-dedup pool
  (`load_sibling_emails()` reads all `outreach*/outreach-log.csv` files
  across sibling campaigns).
- Drop any candidate email that's in the per-brand gmail-touched set
  (run `check-gmail-touched.py <domain>` to get @domain emails the
  operator has corresponded with).

### Output: `verified.csv`
Columns: email, name, title, brand, domain, pattern, source, notes.
Each row is an SMTP-deliverable, named, senior, relevant-role, dedup-clean
email ready to send.

### Probe cost per brand
- Discovery person: 13 probes (all patterns)
- Tricky-name probes: 1 per tricky person (~10% of names typically)
- Trust path: 0 probes
- Per-brand: ~15-20 SMTP probes total for a 14-person brand

---

## STAGE 5 — CROSS-SOURCE DEDUP

### Three dedup sources

1. **Sibling outreach logs** — `outreach*/outreach-log.csv` files across all
   sibling campaigns (Throne, agents, brands-audit, retailers, creators,
   merchants itself).
2. **Gmail correspondence** — `check-gmail-touched.py <domain>` runs gog
   gmail search `to:<domain> OR from:<domain>` against both authed accounts
   (`armaan.priyadarshan.29@dartmouth.edu`, `armaanp4423@gmail.com`),
   extracts every @domain address from To/Cc/Bcc/From of every matching
   message, returns the union.
3. **`cold-call-list.csv`** — the 228 indie brand domains the subagent
   compiled; if an email's domain matches, skip (assumed the operator may
   have hit those manually).

### Why all three
- Sibling logs: prevent re-pitching across campaigns (Caraway might also be
  in retailers — would look weird to get pitched twice with different
  framings).
- Gmail: prevent re-pitching someone the operator has personally corresponded
  with (e.g. operator emailed `hello@carawayhome.com` in April 2026; that
  address gets dropped automatically).
- Cold-call list: subagent output is the operator's manual-research pile;
  treat as already-touched.

### Implementation
- `verify-staff.py:load_sibling_emails()` returns set of all emails from
  sibling logs at script start.
- `check-gmail-touched.py` is a separate utility; its output gets fed in
  per-domain (since checking every domain in 500-brand list against gmail
  would be expensive; defer to discovery time).
- `outreach-merchants/cold-call-list.csv` is read at script start; domains
  added to sibling pool.

### People API NOT available
The gog `people` and `contacts` commands hit `403 accessNotConfigured` — the
Google People API isn't enabled on the gog OAuth project. Workaround: query
gmail directly with `to:<domain> OR from:<domain>` instead of bulk pulling
the contact list. Slightly slower but works without needing the operator to
enable a new API.

---

## STAGE 6 — SEND

### `send-batch.py` — forked from outreach-retailers, v5 verbatim

Reads `verified.csv`. For each row:
1. Build subject (locked `Stanford Student Question - thoughts on AI retail tools`)
2. Build body via `render_body(name, company)`:
   - `{name}` → first word of name field (Jordan, Brett, etc.)
   - `{company}` → brand field (Caraway Home, etc.)
3. Build HTML mirror
4. Invoke `gog gmail send --account <GOG_ACCOUNT> --to <email> --cc <CC_RECIPIENTS> --subject ... --body ... --body-html ...`
5. Wait random 3-8s jitter between sends
6. Append to `outreach-log.csv` with status=`sent`

### Hard requirements
- `GOG_KEYRING_PASSWORD` env var must be set
- `GOG_ACCOUNT` defaults to `armaan.priyadarshan.29@dartmouth.edu`
- CC list hardcoded in `CC_RECIPIENTS` constant
- Dry-run mode (`--dry-run`) renders body + would-send metadata, no actual send

### One-off send overrides
For genuine variations (referral pitch, Dartmouth-only framing), override
`SUBJECT_TMPL`/`BODY_TMPL`/`BODY_HTML_TMPL` in an inline Python wrapper before
calling `send_one()` directly. Each `python3` invocation is a fresh
interpreter so the override doesn't leak. NEVER edit the file template for
one-offs.

---

## STAGE 7 — BOUNCE SWEEP

### `process-bounces.py` — runs ~30 min after send

Identical to `outreach-retailers/process-bounces.py`. Searches the sender's
Gmail for `from:mailer-daemon` DSNs in the last 30 min, parses the
`X-Failed-Recipients:` header from each, joins against `outreach-log.csv`,
marks matching rows `verified=BOUNCED`, optionally trashes the DSNs.

### Operator-visible gotcha
DSNs auto-trash after being processed. If looking for bounces manually, check
the Trash folder, not Inbox. The 2026-05-22 incident had 3 bounces in Trash
that I initially missed because I only searched Inbox.

### Catchall post-bounce
A 250 OK during SMTP RCPT TO does NOT mean delivery succeeds on catchall
servers. They post-bounce 15-60 min later with `550 5.1.1 The email account
that you tried to reach does not exist.` Mitigation: sentinel probe in
Step 1 of verify (above) detects catchall and drops the brand.

---

## FILES REFERENCE

### Scripts
- `source-publicwww.py` — PublicWWW-based brand discovery via gstack browse (legacy for indie batches)
- `verify-domain.py` — Google top-organic per-brand domain verification
- `discover-staff.py` — LinkedIn /company/<slug>/people/ scraper via /connect-chrome headed Chromium
- `verify-staff.py` — SMTP RCPT TO with pattern-locking + prefer-shortest-alias + tricky-name probe + role-block + sibling-dedup
- `smtp-verify.py` — older single-purpose SMTP verifier (superseded by verify-staff.py)
- `check-gmail-touched.py` — per-domain gmail dedup query against both authed accounts
- `send-batch.py` — v5 template send with CCs, jitter, log append
- `process-bounces.py` — DSN sweep + log mark
- `run-campaign.sh` — orchestrator (source → discover → verify → send → bounce-sweep)
- `run-batch.sh` — manual single-batch runner

### CSV artifacts
- `midsize-500.csv` — operator-approved initial guess list, brand+domain+category, 500 rows
- `midsize-500-verified.csv` — Google verification raw results, brand+domain_guess+domain_google+match+top_url+category+notes
- `midsize-500-clean.csv` — final cleaned list with corrections applied, 499 rows (Dyne dropped)
- `cold-call-list.csv` — subagent output, 228 indie brand websites (separate artifact, not for midsize flow)
- `trimmed.csv` — per-batch input to discover-staff (brand+domain rows the operator approves for processing)
- `contacts.csv` — discover-staff output (domain+brand+name+title+source_url+notes)
- `verified.csv` — verify-staff output (email+name+title+brand+domain+pattern+source+notes)
- `outreach-log.csv` — canonical send log (name+brand+email+date_sent+verified+notes), append-only
- `demo-one.csv` — one-brand test input (e.g. Caraway demo for staff discovery)

### Documentation
- `OUTREACH.md` — this playbook
- `README.md` — ops doc (commands, current state, resumption)

### Scratch / cache (gitignored)
- `.env` — `HUNTER_API_KEY` (currently exhausted; verify-staff doesn't depend on it)
- `.cache/` — gmail-touched per-domain results, sentinel probes
- `logs/` — per-stage log files

### Sibling outreach campaigns (different audiences, different scripts)
- `outreach/` — Throne brand campaign
- `outreach-agents/` — agentic-commerce data infra pitch
- `outreach-brands-audit/` — single-brand DTC audit pitch
- `outreach-retailers/` — multi-brand retailers/marketplaces
- `outreach-creators/` — UGC creators

---

## FAILURE MODES LEARNED

These are documented in `~/.claude/projects/-home-armaan-Documents-Giftly/memory/`
as separate feedback files. Each is one I'd repeat without a memory pin.

### 1. Catchall post-bounce (`feedback_catchall_post_bounce.md`)
SMTP RCPT TO returns 250 on catchall domains. Server post-bounces with 550
DSN 15-60 min later. Solution: sentinel probe to detect catchall, drop the
whole brand. NEVER set `--catchall-policy send-named`.

### 2. LinkedIn cookie inject gets flagged (`feedback_linkedin_scraping.md`)
Cookie injection from real browser into headless Playwright session triggers
LinkedIn's anti-bot. Premium account doesn't help (Premium unlocks features,
not bot exemption). Solution: use `/connect-chrome` instead (real visible
Chromium with the gstack extension; same fingerprint LinkedIn trusts).

### 3. Pattern discovery picks alias not primary (`feedback_pattern_pick_shortest.md`)
Old logic stopped at first VALID. Picked `jordan.nathan@` instead of `jordan@`
because `first.last` was ranked #1 in PATTERN_ORDER. Both deliverable but
`jordan@` is the canonical primary. Solution: probe ALL patterns, pick
shortest verified local-part.

### 4. LinkedIn keyword tiers (`feedback_linkedin_keyword_tiers.md`)
Indie brands have no CMO/VP layer — searching `director` returns 0 useful
results. Use `owner`/`founder`/`co-founder` for indie, `director`/`vp`/`head`
for midsize. Pick by company size band.

### 5. New campaign co-design (`feedback_campaign_codesign.md`)
"Fully automated" doesn't mean skip the design conversation. For any new
outreach campaign, walk through architecture interactively + start with a
10-send test BEFORE going to scale.

### 6. Brand email patterns reference (`reference_brand_email_patterns.md`)
Per-brand pattern observations across all prior outreach campaigns. Useful
when no Workspace probe is possible. Spanx/Skims/Glossier/Vuori =
`first.last@`. Kate Spade = `firstinitial+lastname@`. Indies = `first@`.
~80 brands documented.

### 7. Paste format parsing (`feedback_paste_format.md`)
When the operator pastes an email + name, use the name in the greeting.
Never drop it.

### 8. Outreach send friction (`feedback_outreach_send_friction.md`)
In manual-paste flow, just send. Don't confirm guessed emails or flag dupes.

### Other bugs caught and fixed this session
- `lstrip("www.")` strips chars not strings, corrupts `wearpact.com` to
  `earpact.com`. Use `removeprefix("www.")`.
- Discover-contacts name regex matched garbage like "Sellers", "Standards
  Name Ethos" via too-broad blocklist. Tightened token-blocklist + brand-
  name overlap filter + verb-context narrative pattern.
- `re.IGNORECASE` flag corrupted name character class — `[A-Z]` matched
  lowercase letters under IGNORECASE in Python re. Switched to inline
  `(?i:...)` for verbs only, kept name char-class case-sensitive.

---

## CURRENT STATE (2026-05-23)

### Pipeline status
- ✅ 499-brand midsize list (Google-domain-verified, 391 confirmed + 86
  corrected + 22 manual-review accepted as-is)
- ✅ Domain-verifier built and run
- ✅ Discover-staff using LinkedIn company People tab via `/connect-chrome`
- ✅ Verify-staff with prefer-shortest pattern + tricky-name probe + 89
  role-block + sibling-dedup
- ✅ Per-domain gmail-touched dedup utility
- ✅ Send pipeline (v5 template, CCs)
- ✅ Bounce sweep

### Caraway Home (demo run completed)
- Domain confirmed: `carawayhome.com` (Google + Wayback + jordan@ SMTP probe)
- 14 senior named contacts identified via LinkedIn company People tab
  + keyword search (director, vp, head, chief, marketing, growth, brand,
  product, ecommerce)
- Pattern locked at `first` (jordan@) via prefer-shortest
- 14/14 verified including KoL Unger (probed as tricky, kol@ exists)
- Gmail-dedup applied: `hello@carawayhome.com` excluded (operator's April 2026
  outreach to Caraway)
- `verified.csv` ready to send

### Tasks open
- Send the 14 Caraway emails (pending operator go-ahead)
- Apply the same playbook to brand #2 from the 499-brand list

### Sending account
- Default: `armaan.priyadarshan.29@dartmouth.edu` (Workspace, MX = Google)
- Secondary: `armaanp4423@gmail.com`
- CCs every send: Samarjit, Ethan, Shamit (operator can drop Ethan from
  CC_RECIPIENTS if his parallel campaign is flooding the operator's inbox)
- Send keyring: `GOG_KEYRING_PASSWORD` required for live sends

### Hunter.io quota
Exhausted for the month (50 verifications and 25 searches across endpoints,
all share the same monthly bucket on free tier). Pipeline does NOT depend on
Hunter — SMTP verification via the operator's own machine (port 25 open) is
the primary verification method. Hunter is a backup, currently dormant.
