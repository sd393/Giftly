# LinkedIn Sales Nav Outreach Guide

## Files You Need

| File | Location | Purpose |
|------|----------|---------|
| **OUTREACH_MASTER_LIST.csv** | `outreach-agents/` | Your complete contact list with 304 people across 91 companies. Use the `linkedin_search` column to find people on Sales Nav. |
| **outreach-log.csv** | `outreach-agents/` | The original email campaign results. Shows which companies had successful sends (status="sent"). |
| **contacts.csv** | `outreach-agents/` | Raw research data with all 304 contacts ranked by priority. Reference if you need more context on a person. |
| **OUTREACH.md** | `outreach-agents/` | The pitch playbook. Copy the body template if you want to keep messaging consistent. |

---

## Your Contact List

**304 total contacts across 91 companies:**
- **91 P1 contacts** (CEO/Founder/Head of Product) — primary targets
- **89 P2 contacts** (Co-Founder/Senior exec) — fallback if P1 doesn't respond
- **76 P3 contacts** (VP-level) — third choice
- **34 P4 contacts** (Director-level) — last resort
- **14 P5 contacts** (Manager-level) — rarely use

**Status:**
- **85 P1 contacts already sent email to** (marked "SENT_P1" in the master list)
- **219 contacts remaining** to reach out to (P2-P5 + unsent P1s)

---

## How to Use OUTREACH_MASTER_LIST.csv

1. **Open in Excel/Sheets**
2. **Filter by status**:
   - `SENT_P1` = companies where the email went through (good starting point)
   - Blank = not yet reached (fallback contacts)
3. **Filter by category**:
   - Start with `agent-infra` and `agent-payments` (highest success rate)
   - Move to `b2b-procurement`, `brand-side` next
   - Finish with `consumer-shopping` and `saas-procurement` (lower engagement)
4. **For each contact you want to reach:**
   - Copy the `linkedin_search` string (e.g., `"Julie Bornstein" Daydream`)
   - Paste into LinkedIn Sales Nav search box
   - Note their email + activity
   - Check for mutual connections
   - Message or request intro

---

## Sales Nav Search & Message Workflow

### Search
1. Go to LinkedIn Sales Nav
2. Click **Search** → **People**
3. Paste the `linkedin_search` value from the CSV into the search box
4. Hit Enter
5. Click the person's profile
6. Note: **Email address is usually shown on the profile** in Sales Nav

### Message
For first contact:
```
Hi [Name],

I saw [company] is building [specific thing from their LinkedIn/website]. 

We're building a product data API for shopping agents — ranked picks + trust signals from evaluators. Wondering if that's something [company] would layer in.

Worth a quick call to explore? I think we could be useful.

— Armaan
```

For follow-up to the original email:
```
Hi [Name],

Sent you a note about Giftly a few weeks ago. Quick follow-up — is product ranking a gap for [company] right now?

Open to a 15-min call if it makes sense.

— Armaan
```

---

## Recommended Outreach Order

### Week 1: High-Signal Companies (Agent Infrastructure)
These have 68% email success rate and are actively hiring/fundraising.

Start with: Browserbase, Apify, Steel.dev, Firecrawl, Kernel, Skyvern, Bright Data, Browserless

For each:
- Find P1 contact (already sent to)
- Find P2 and P3 contacts (new outreach)
- Use Sales Nav to search, grab emails, message

### Week 2: Agent Payments + B2B Procurement
60% and 54% success rates respectively.

Start with: Skyfire, Rye, Basis Theory, Crossmint, Levelpath, Omnea, Lio, Magentic

### Week 3: Brand-Side / Merchant Enablement
45% success rate. These are bigger companies, so use warm intros where possible.

Start with: Capacity, Crescendo, Tidio, Constructor, Aampe, Rep AI

### Week 4+: Consumer Shopping + SaaS Procurement
Lower success but large list. Focus on companies where P1 emails went through.

Start with: Phia, Doji, Hey Savi, Karma, Haut.AI, Albatross AI

---

## Quick Wins

**Fastest path to meetings:**

1. **Pick top 10 companies** (agent-infra + agent-payments with successful sends)
2. **For each company, find 3 contacts:**
   - P1 (already researched, email sent)
   - P2 (co-founder/senior exec)
   - P3 (VP-level, often head of product)
3. **Message all 30 people this week**
4. **Follow up on replies next week**

At 5-10% response rate from Sales Nav messages, you should get 1-3 meetings from this push.

---

## Where to Find Email Addresses

If Sales Nav doesn't show email:
1. **Check their Twitter/X bio** (often has email)
2. **Check the company website** (footer, team page, exec bios)
3. **LinkedIn About section** (many people list company email)
4. **Google search**: `"[name]" [company] email`

---

## Reference Files

Open these if you need more context:

- `OUTREACH.md` — Full pitch playbook + company categories
- `outreach-log.csv` — See which companies/people responded to the original email (even though it was marked "sent", some may have engaged)
- `contacts.csv` — Full research on all 304 people + notes on funding/size

---

## Pro Tips

- **Sort OUTREACH_MASTER_LIST.csv by priority** to focus on decision-makers first
- **Use Sales Nav's "Last Activity" filter** — message people who posted recently (more likely to reply)
- **Check mutual connections before messaging** — ask LinkedIn who you both know
- **Message at 9-10am their timezone** — highest open rates
- **Keep messages short** (2-3 lines) — Sales Nav messages that are too long get scrolled past
- **Send follow-ups 3-5 days later** if no reply (don't spam, just one follow-up)

---

**Total time investment:** ~30 min per 10 people (search + message + note contact)
**Target:** 30-50 messages this month → 2-5 meetings
