# Giftly Agent-Outreach Playbook

Cold outreach to companies building shopping agents — pitching them a
Giftly API for product picks and trust signals from a network of human
evaluators.

This is a **separate campaign** from `outreach/` (DTC brands + creators).
Different audience, different pitch, different log. Do not cross the
streams: scripts here only read/write `outreach-agents/outreach-log.csv`.

## Pitch (one-liner)

We give shopping agents a product API: ranked picks plus trust signals from
a network of human evaluators, so the agent recommends things its user will
actually keep. This cold email asks the founder/eng lead if they want a
15-minute call.

## Targets

Companies anywhere in the agentic-commerce stack that ultimately need to
choose products on a user's behalf. From the April 2026 landscape:

- **Consumer shopping agents** — ChatGPT Shopping, Atlas, Rufus, Comet,
  Gemini AI Mode, Copilot Checkout, Daydream, Phia, Onton, Cherry, Henry AI,
  Aesthetic, Style.ai, OneOff.
- **B2B procurement agents** — Lio, Magentic, Tacto, Levelpath, Pactum,
  Evolinq, Turian, Zip, Omnea, Order.co, BRM, Oro Labs, Procol.
- **Browser & agent infrastructure** — Browserbase, Browser Use, Stagehand,
  Anchor, Steel.dev, Skyvern, Airtop, Bright Data, Firecrawl, Apify, Kernel.
- **Merchant enablement** — Rep AI, Crescendo, Tidio Lyro, Alhena, iAdvize,
  Swap, Constructor, Capacity, Envive, Aampe, DaVinci Commerce, Salesforce
  Agentforce, Shopify, commercetools, BigCommerce, Rye.
- **Payment / identity rails** — Skyfire, Basis Theory, Nekuda, PayOS,
  Crossmint, Slash, Trulioo (only when they touch product selection).

**Avoid:** the foundation-model labs themselves (OpenAI, Anthropic, Google,
Meta) — wrong contact level for a cold email. Hit teams inside their orgs
only via warm intros. Also skip pure protocol bodies (UCP, ACP, AP2) unless
there's a specific commercial team.

The `category` column on each batch row should record which slice a target
belongs to so we can segment reply rates later.

## Email format

- **Subject** (exact, no variations): `Stanford/Dartmouth Student Inquiry`
- **Body template** lives in `send-batch.py` (`BODY_TMPL`). Two
  substitutions: `{greeting}` (resolved per-row) and `{company}`:

  ```
  {greeting}

  We are Stanford/Dartmouth students building data infrastructure for people to trust agents with purchases. We've established a network of humans who evaluate products and are turning the results into structured, queryable data for agentic commerce solutions.

  Curious if this could be useful for what {company} is building. Would you be open to chat?

  Thanks,
  Armaan
  ```

- **Greeting personalization** — `first_name_from()` in `send-batch.py`:
  1. If the input CSV row has a `name` column, the first token (cleaned
     of punctuation) becomes the greeting → `Hi Julie,`.
  2. Otherwise, if the scraped email's local part looks like a person's
     name (≥3 alpha chars, not a role address like `hello@`/`info@`/
     `partnerships@`), use that → `julie@daydream.com` → `Hi Julie,`.
  3. Otherwise → `Hi,`.

  This is best-effort. If you want a guaranteed first name, fill the
  `name` column in `batch.csv` (manually or via Haiku research pass).
- Sign off `Thanks,\nArmaan`. Plain text only.
- No em dashes, no exclamation marks, no buzzwords, no flattery — same
  hygiene as the brand campaign.
- Company-name normalization is intentionally light (whitespace only). Do
  not title-case `OpenAI`, `JAGGAER`, `BRM`, `x402`, etc. — the body
  shows `company` verbatim.

## Workflow

For a list of target companies (e.g. extracted from the agentic-commerce
landscape doc):

### 1. Research the companies — Haiku subagent (web search)

This is a **mandatory** first stage. Don't go straight to scrape — these
are tech companies whose `/contact` pages are usually generic, so the
greeting personalization and dedup quality both depend on having a real
founder/contact name and a confirmation that the company actually fits
the target list. Claude Code does this by spawning a Haiku subagent with
web search; never use Opus WebSearch for this — same token-cost reason
as the brand pipeline.

**Prompt template** (copy verbatim into the Agent call, fill in the
company list):

```
Research each company below for a cold-outreach campaign. For each, use
web search to find:

1. canonical root domain (e.g. "openai.com", not "www.openai.com" or
   "https://openai.com/api/")
2. a likely outreach contact — founder, CEO, head of product, or head
   of partnerships/BD. Prefer publicly listed names with their role.
   Leave blank if no clear public contact.
3. a one-line summary of what they do (specifically, what their agent
   or shopping/procurement product does)
4. in-scope check: are they actually building a shopping agent,
   procurement agent, agent infrastructure, payments/identity for
   agents, or merchant enablement for agents? Mark true/false.

Return CSV with this exact header and one row per company, no extra
commentary:

name,role,company,domain,category,notes,in_scope

- `category` is what I gave you in the input list (pass through verbatim)
- `notes` is your one-line summary
- `in_scope` is "true" or "false"
- if you can't resolve the domain, write "UNKNOWN" in the domain column
- preserve company name casing exactly (OpenAI, BRM, x402, JAGGAER, etc.)

Companies (format: company | category):
- Daydream | consumer-shopping
- Lio | b2b-procurement
- Browserbase | browser-infra
- ...
```

Spawn it with `Agent(subagent_type="general-purpose", model="haiku", ...)`
— the general-purpose agent has WebSearch/WebFetch in its tool set.

**After the subagent returns:**

1. Save the CSV to `batch.csv` (gitignored).
2. Drop rows where `in_scope=false` or `domain=UNKNOWN` (or hand-resolve
   the worth-keeping ones). The `in_scope` column is consumed at this
   stage only — the scraper ignores it.
3. Eyeball the result. Tech-company outreach has a low margin for being
   wrong about who you're talking to; a 60-second human pass here pays
   off vs sending to a miscategorized target.

The scraper preserves whatever columns are in `batch.csv`, so any extra
columns you add (e.g. `priority`, `linkedin`) flow through. Even when
`name` ends up blank after research, the sender will still try to
extract a first name from the scraped email's local part as a fallback.

### 2. Run the batch — one command

```bash
GOG_KEYRING_PASSWORD=... ./run-batch.sh batch.csv <account-email>
```

`run-batch.sh` chains the three stages and prints one summary line per stage:

- **scrape** — `scrape-batch.py` fetches root, `/contact*`, `/about*`,
  `/team`, `/company` on each domain, extracts emails whose root domain
  matches, rewrites the CSV with `email` and `email_source`. Only
  `email_source` starting with `https://` counts as verified.
- **send** — `send-batch.py` filters to verified rows, dedupes against
  `outreach-log.csv` by exact normalized company match, sends each via
  `gog gmail send` with 3–8s jitter, appends to the log. **No platform
  mirror** — agent-campaign data lives in CSV only for now.
- **bounce** — `process-bounces.py` searches for DSNs from the last 30
  minutes, parses `X-Failed-Recipients:`, marks matching log rows
  `BOUNCED`, trashes the DSNs.

Per-row detail lands in `logs/scrape-<stem>.log`, `logs/send-<stem>.log`,
`logs/bounces-<date>.log`.

### 3. Driving this as Claude (Opus)

- **Read only the summary.** Don't `cat` the logs or invoke the underlying
  scripts manually unless something looks off.
- **Delegate company→domain to Haiku.** Same as brand pipeline.
- **Don't hand-edit outreach-log.csv** for bounces. `process-bounces.py`
  owns the bounce column.
- Reply rates here will be lower than the brand campaign — these are tech
  companies, scraped emails are usually `hello@` or `press@`, and the
  pitch is more abstract. Plan for a higher manual-sourcing fraction
  (LinkedIn, Twitter DMs, intros) once the first batch lands.

## Sending accounts

Reuse the same `gog`-authed accounts as the brand campaign:

- `armaanp4423@gmail.com` — default for this campaign.
- `armaan.priyadarshan.29@dartmouth.edu` — secondary.

Pass `--account <email>` (or `GOG_ACCOUNT`) explicitly. `run-batch.sh`
handles this via its second argument.

## Hard rules

- **Only verified-scraped emails.** `email_source` must start with
  `https://`. Same `hello@{domain}` fallback exists in the scraper but
  `send-batch.py` filters it out.
- **No duplicate sends.** `send-batch.py` dedupes against
  `outreach-log.csv` (this directory's, not `outreach/`'s) by exact
  normalized company match.
- **No platform mirror.** Agent campaign does not write to the Giftly
  internal platform. If we want it later, add a `--mirror` flag and a
  `company` entity type — don't silently turn it on.
- **Subject and body live in `send-batch.py`.** Do not template-format
  outside of `{company}`. Do not introduce per-account templates until
  there's a real second sender.
- No Hunter, no pattern-guessing. Only addresses extracted from the
  company's own contact/about/team pages.
