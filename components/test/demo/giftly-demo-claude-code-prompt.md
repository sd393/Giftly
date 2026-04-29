# Claude Code Prompt: Giftly PearX Demo

> Paste everything below this line into Claude Code as a single prompt. It assumes a Next.js project with an existing landing page and design system already in place. Do **not** modify the existing landing page or override its visual conventions — defer to the project's existing design tokens (colors, typography, spacing, components) for the brand portal, creator portal, and data view. Only the Amazon section has its own visual specs (it must look like Amazon, not Giftly).

---

## What you're building

A four-page demo for an investor pitch, added on top of the existing project. It tells one continuous story across three connected sections: a creator-brand seeding platform → the structured data it produces → an AI shopping agent (Amazon's Rufus) making recommendations with vs. without that data.

The whole demo follows **one brand and one product end-to-end**: a fictional dandruff shampoo brand called Lumina Pro. Part 1 shows the brand onboarding and the creator-side experience. Parts 2 and 3 show what the platform's data and impact look like after the platform has run for some time. The narrative is one company's lifecycle on Giftly; build it that way.

## Tech stack

- Next.js (existing project) with App Router, TypeScript, Tailwind CSS
- shadcn/ui for components — reuse whatever's already installed; install missing primitives as needed
- lucide-react for icons
- Hardcoded mock data lives in `lib/mockData.ts`. **The mock data itself does not change at runtime** — it's the source of truth for static content (creators, products, matches, reviews, Rufus responses)
- React state for interactions; **localStorage for persistence of user-interaction state across page refreshes** (see Persistence section below)

## Project structure

Add to the existing project:

```
/app
  /brand/page.tsx          — Section 1A: brand portal
  /creator/page.tsx        — Section 1B: creator portal
  /data/page.tsx           — Section 2: structured data view
  /shopping/page.tsx       — Section 3: mock Amazon + Rufus
/components
  /BrandPortal/...
  /CreatorPortal/...
  /DataView/...
  /Amazon/...
/lib
  /mockData.ts             — all mock brands, creators, matches, products, reviews
  /types.ts                — TypeScript types
  /usePersistedState.ts    — small hook wrapping useState with localStorage sync
```

Each section page is reachable directly via its URL. The existing landing page handles overall navigation; do not add a heavy top nav across these section pages. A lightweight cross-section navigation (small text links to the other three sections, e.g. in a corner or footer) is fine if it integrates cleanly with the existing layout — otherwise leave the section pages standalone and let the founder switch via URL during the demo.

---

## Section 1A: Brand portal (`/brand`)

We're logged in as Lumina Pro Dandruff Care.

### Layout

- Left sidebar: brand profile snippet (logo placeholder, "Lumina Pro Dandruff Care", "Founded 2024 · DTC · Personal care"), navigation items (Products / Matches / Performance / Settings — only "Products" and "Matches" need to function; the others can be inactive)
- Main column: tabbed view with two tabs — "Your products" and "Active matches"

### "Your products" tab

A single product card showing:
- Product image (Unsplash search "shampoo bottle" or similar minimal product photo)
- Name: **Lumina Pro Stress-Defense Shampoo**
- Tagline: "Clinically-formulated for stress-induced flare-ups"
- Retail price: **$28**
- Active ingredients: zinc pyrithione 1%, salicylic acid 2%, niacinamide
- Affiliate commission offered: **15%**
- Status: "Active — accepting matches"

Below the card, a "+ Add product" button (decorative).

### "Active matches" tab

The centerpiece of the brand portal. Two sections:

**Suggested creators (5)** — a list of 5 creator cards. Each card shows:
- Avatar + handle + display name
- Audience size, primary niche, location
- A **fit score** as a circular badge: e.g. "92% fit"
- Three structured "Why this match" bullets — clickable to expand for more detail

**In progress (3)** — cards showing the pipeline status (Approved → Shipped → Delivered → Awaiting reaction → Posted).

### Mock data — creators to suggest

```
1. @samanthaskin — Samantha Lee, 12.4k followers, NYC, niche: skincare/wellness
   Fit score: 94%
   Why this match:
   - 61% audience overlap with your buyer profile (women 25–34, urban, skincare-engaged)
   - Posted 4 scalp/dandruff content pieces in last 90 days
   - Avg engagement on personal-care reviews: 6.2%

2. @thedermdiaries — Priya Raman, 8.7k, LA, niche: skincare science
   Fit score: 89%
   Why this match:
   - Background in dermatology; audience indexes high on ingredient-led purchases
   - Mentioned dandruff or seborrheic dermatitis in 7 posts this year
   - 78% of recent reviews resulted in viewer-reported purchases

3. @curlyandflaky — Maya Thompson, 23k, Toronto, niche: hair/scalp care
   Fit score: 87%
   Why this match:
   - Niche specifically on scalp issues; audience highly intent-driven
   - Audience size at upper edge of your targeting (under 25k)
   - Engagement rate 7.1% on hair-product reviews

4. @hairsciencegirl — Elena Park, 15.2k, Chicago, niche: hair science explainers
   Fit score: 83%
   Why this match:
   - Educational format suits your ingredient-led positioning
   - Recent video on zinc pyrithione has 89k views
   - Audience trusts science-led claims (low purchase friction)

5. @minimalskinroutine — Jordan Davis, 6.8k, SF, niche: minimalist skincare
   Fit score: 76%
   Why this match:
   - Smaller audience but very high engagement (8.4%)
   - Audience demographic aligns (urban, 28–38)
   - Has not posted hair-product content before — audience may be receptive to expansion
```

### Mock data — in-progress pipeline

```
1. @samanthaskin — Status: Delivered (2 days ago) — "Awaiting creator reaction"
2. @thedermdiaries — Status: Shipped — "In transit, expected Tuesday"
3. @curlyandflaky — Status: Approved — "Pending shipment"
```

### Interactions

- Clicking a creator card in "Suggested" expands it inline to show full reasoning (the three bullets become longer paragraphs) and reveals an "Approve match" button
- Clicking "Approve match" moves the card from Suggested to In Progress (with status "Approved → Pending shipment"). **This state persists across refreshes via localStorage.**
- Clicking an in-progress card opens a side panel showing tracking info (mock)

---

## Section 1B: Creator portal (`/creator`)

Logged in as @samanthaskin.

### Layout

- Left sidebar: creator profile snippet (avatar, handle, audience size), navigation (Inbox / Active gifts / History / Earnings — only Inbox and Active gifts need to function)
- Main column: tabbed view — "Inbox", "Active gifts"

### "Inbox" tab

Three offer cards. The first is from Lumina Pro.

**Critical UX requirement:** the no-obligation language must be the most prominent visual element on each offer card. Not a footer disclaimer. Make it a banner-style callout at the top of each card, with the words clearly readable:

> **No obligation.** If you receive this and don't love it, just tell us why — that's worth as much to us as a post.

Each offer card shows:
- Brand logo + name
- Product name + image
- Affiliate commission (15%)
- A "Why we matched you" section (one or two sentences, brand-side reasoning)
- Two buttons: **Accept the gift** (primary) / **Pass on this one** (secondary, outlined)

### Mock data — inbox offers

```
1. Lumina Pro Dandruff Care — Lumina Pro Stress-Defense Shampoo, 15% commission
   "We matched you because your audience indexes high on personal-care content
    and you've posted about scalp health four times in the last 90 days."

2. NorthBean Coffee Co. — Single-origin Ethiopian, 12% commission
   "Your morning-routine content reaches an audience that overlaps strongly
    with our specialty-coffee buyer profile."

3. Verdant Skincare — Niacinamide serum, 18% commission
   "You've engaged consistently with ingredient-led skincare content; this
    fits the discussion you started two weeks ago about minimalist routines."
```

### "Active gifts" tab — post-delivery feedback flow

One card representing a gift that has been delivered (the Lumina Pro gift). The card prompts the creator to log a reaction.

**Critical UX requirement:** three first-class options, **equal visual weight**:

- **I love it (I'll post)**
- **I don't love it (here's why)**
- **Still trying it (check back in 14 days)**

All three buttons identical in size, prominence, and treatment. The "didn't love it" path being equal-weight to the positive option is a deliberate UX choice — leave a code comment marking this so future engineers don't "fix" it.

Clicking "I don't love it" expands the card to show structured decline reasons as checkboxes (multiple selectable):

- Didn't work for my hair type
- Didn't see results in time tested
- Fragrance/scent
- Packaging or formulation issue
- Caused irritation or made it worse
- Not a fit for my audience
- Other (free text)

Plus a free-text field for additional context.

Clicking "I love it (I'll post)" expands to show a content-submission step (post URL field, content type dropdown, scheduled date) — visual completeness only, doesn't need to submit anywhere.

**Persistence:** the creator's selections (accepted / declined offers, feedback choice on the active gift) persist across refreshes.

---

## Section 2: Match data view (`/data`)

The asset Giftly produces.

### Header

- Title: "Match outcomes — Lumina Pro"
- A toggle in the top-right: "View by: [Match-level rows | Product summary]" — both views work, toggle state persists across refreshes

### Match-level rows view (default)

A clean structured table using shadcn's Table component. Columns:

1. Date
2. Brand
3. Product
4. Creator (handle)
5. Audience size
6. Predicted fit score
7. Outcome (color-coded pill: green for posted-positive, amber for posted-with-caveats, gray for declined-at-offer, light gray for accepted-then-no-post)
8. If posted: link to post + engagement
9. If declined or no-post: structured reason

Show 12 rows. Mix of outcomes:
- 6 posted-positive (Lumina Pro)
- 2 posted-with-caveats
- 2 accepted-but-no-post (with reasons)
- 2 declined-at-offer

### Mock data — sample rows

```
| Date  | Creator              | Audience | Fit | Outcome              | Detail
|-------|----------------------|----------|-----|----------------------|--------
| 09/12 | @samanthaskin        | 12.4k    | 94% | Posted (positive)    | 8.2k views · "Actually worked for stress flares" · 47 affiliate clicks
| 09/14 | @thedermdiaries      | 8.7k     | 89% | Posted (positive)    | 5.1k views · "Ingredient list checks out" · 31 clicks
| 09/15 | @curlyandflaky       | 23k      | 87% | Posted (with caveats)| 14k views · "Worked but smell isn't for me"
| 09/18 | @hairsciencegirl     | 15.2k    | 83% | Posted (positive)    | 22k views · Educational explainer on zinc pyrithione
| 09/19 | @minimalskinroutine  | 6.8k     | 76% | Accepted, no post    | "Tried for 3 weeks, didn't see enough difference to recommend"
| 09/22 | @scalpscience        | 9.4k     | 81% | Posted (positive)    | 6.7k views · "Most effective stress-flare product I've tried"
| 09/23 | @hairlabgirl         | 17k      | 79% | Posted (positive)    | 11k views · A/B with previous shampoo
| 09/24 | @glowyhairdiaries    | 4.2k     | 71% | Declined at offer    | "Already promoting a competing brand this month"
| 09/25 | @rootsandstrands     | 28k      | 73% | Posted (with caveats)| 19k views · "Helped, but I needed two bottles to see results"
| 09/26 | @scalprx_journey     | 11k      | 78% | Accepted, no post    | "Caused mild irritation on day 4 — stopped using"
| 09/28 | @cleanhaircollective | 8.1k     | 84% | Posted (positive)    | 6.3k views · Routine integration video
| 09/29 | @hairtruthtelling    | 5.9k     | 69% | Declined at offer    | "Don't take dandruff brands — out of audience scope"
```

### Product summary view (toggled)

Side-by-side comparison of three competing dandruff products on the platform. Three large cards:

```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ LUMINA PRO          │ │ ScalpRX             │ │ DermaKlear          │
│ Stress-Defense      │ │ (competitor)        │ │ (competitor)        │
│                     │ │                     │ │                     │
│ POST RATE           │ │ POST RATE           │ │ POST RATE           │
│ ▰▰▰▰▰▰▰▰▱▱  81%    │ │ ▰▰▰▱▱▱▱▱▱▱  27%    │ │ ▰▱▱▱▱▱▱▱▱▱  7.5%    │
│ 38 of 47 creators   │ │ 12 of 45 creators   │ │ 3 of 40 creators    │
│                     │ │                     │ │                     │
│ Avg sentiment 4.6   │ │ Avg sentiment 3.2   │ │ Avg sentiment 2.1   │
│ Conversion 5.2%     │ │ Conversion 1.8%     │ │ Conversion 0.6%     │
│                     │ │                     │ │                     │
│ TOP THEME           │ │ TOP DECLINE REASON  │ │ TOP DECLINE REASON  │
│ "actually worked    │ │ "no visible change  │ │ "made my scalp      │
│ for stress flares"  │ │ after 3 weeks"      │ │ worse"              │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

Use a horizontal bar for the post rate so the visual difference is immediate. The Lumina Pro post-rate bar should be visually emphasized (saturated fill); competitors muted. The point being landed: post rate alone tells you which product is good, the other metrics confirm it.

Below the three cards, a one-line callout in italics:

> *Post rate among non-paid, no-obligation creator recipients is the cleanest available signal of organic product preference. This is the row of data Giftly produces that does not exist anywhere else.*

---

## Section 3: Mock Amazon + Rufus (`/shopping`)

The agent demo. The most important section. **This section has its own visual style — recreate Amazon's actual look. Do NOT defer to the project's design tokens here.**

### Visual chrome (Amazon-specific styling)

- Top header: dark navy bar (`#131921`) with "amazon" wordmark (lowercase, orange smile arrow underneath), location pill ("Deliver to Berkeley 94704"), search bar with category dropdown, "Hello, Sign in / Account & Lists" links, cart icon
- Search bar prefilled: **best dandruff shampoo for stress flare-ups**
- Below header: thinner secondary nav (`#232F3E`) with category links (All, Today's Deals, Customer Service, Registry, Gift Cards) — decorative
- Main layout: left filter rail (~240px), main results grid (3 columns), right Rufus panel (~360px)
- Amazon palette: `#131921` dark header, `#232F3E` secondary header, `#FF9900` orange CTA, `#007185` link blue, `#0F1111` text, `#FFA41C` star yellow
- Typography: tighter, denser than the Giftly sections — match Amazon's actual feel

### Left filter rail

Standard Amazon filter style. Sections:
- Department (Beauty & Personal Care selected)
- Customer Reviews (4 stars & Up, 3 stars & Up, etc.)
- Price (slider or buckets)
- Brand (checkboxes)
- Hair Concern (Dandruff, Dry scalp, etc.)

Decorative — clicks don't filter.

### Product grid

Six product cards. Each card has:
- Square product image
- Title (bold, blue-ish on hover)
- Star rating + review count
- Price + Prime badge
- "Sponsored" tag on some cards

Use exactly this product set; the order changes between the two demo states:

```
A. ScalpRX Anti-Dandruff Shampoo — 4.3★ (12,847 reviews) — $14.99 — Prime — Sponsored
B. DermaKlear Medicated Shampoo — 4.1★ (8,232 reviews) — $11.50 — Prime
C. Lumina Pro Stress-Defense Shampoo — 4.6★ (412 reviews) — $28.00 — Prime
D. Head & Shoulders Classic Clean — 4.5★ (47,109 reviews) — $8.97 — Prime
E. Nizoral A-D Anti-Dandruff — 4.4★ (24,300 reviews) — $14.27 — Prime
F. T/Gel Therapeutic — 4.3★ (9,840 reviews) — $11.20 — Prime
```

### Rufus side panel

Right side, fixed-width panel that looks like a chat interface. Branded as Rufus (Amazon's AI shopping assistant). Header: small Rufus logo + "Rufus" + tagline "Your AI shopping assistant".

The page has two states, controlled by a toggle at the top of the Rufus panel: **"Without Giftly signal" / "With Giftly signal"**. The toggle is a UI control on the page so the founder can flip it live during the demo. **Toggle state persists across refreshes** so an accidental refresh during the pitch doesn't reset it.

### Without Giftly signal (default state)

Rufus thread:

> User: best dandruff shampoo for stress flare-ups
>
> Rufus: Based on Amazon customer reviews and bestseller data, here are the top picks:
>
> 1. **ScalpRX Anti-Dandruff Shampoo** — 4.3★ with over 12,000 reviews. Many customers report relief from itchy, flaky scalp.
>
> 2. **Head & Shoulders Classic Clean** — A trusted bestseller with 4.5★ from 47,000+ reviews.
>
> 3. **Nizoral A-D** — Contains ketoconazole; 4.4★ from over 24,000 customers.
>
> Top review quote: *"Amazing!!! Best shampoo ever, fixed my dandruff in one wash, 5 stars!!!"* (verified purchase)

Product grid order in this state: **A, D, E, B, F, C** — ScalpRX first, Lumina Pro last.

### With Giftly signal (toggled state)

A small Giftly signal block appears above the Rufus response:

> 🌿 **Giftly signal:** 47 unpaid creators received samples of three competing products with no obligation to post.
>
> | Product | Post rate | Sentiment |
> |---|---|---|
> | Lumina Pro | 81% (38/47) | 4.6 |
> | ScalpRX | 27% (12/45) | 3.2 |
> | DermaKlear | 7.5% (3/40) | 2.1 |

Then the chat:

> Rufus: Looking at how real people respond when they're not being paid to post:
>
> **Lumina Pro Stress-Defense Shampoo** stands out clearly — 81% of creators who received it without any obligation to post chose to post about it organically, and the most common feedback specifically mentioned stress-induced flare-ups, which matches your situation. ScalpRX has more Amazon reviews, but only 27% of unpaid creators chose to post about it, and the most common reason for not posting was "no visible change after 3 weeks."
>
> **Recommendation: Lumina Pro Stress-Defense Shampoo** ($28). It's based on independent, unpaid evaluation rather than ad-incentivized reviews.

Product grid order in this state: **C, A, E, D, B, F** — Lumina Pro jumps to position one. **The re-rank must animate smoothly** (use Framer Motion's layout animations or CSS transitions, ~250–400ms) so the partner physically *sees* commerce shift. This is the climactic visual of the demo.

When toggling: Rufus thread content swaps, product grid re-orders with smooth transition, subtle pulse on the new top product.

---

## Persistence

State that should survive a page refresh:

- **Brand portal:** approved matches (which suggested creators have been moved to in-progress)
- **Creator portal:** offer responses (accepted/declined per offer), and the active-gift feedback selection (love / don't love + reasons / still trying)
- **Data view:** which view is active (rows vs product summary)
- **Shopping page:** Rufus toggle state (with vs without Giftly signal)

Implementation: a small `usePersistedState<T>(key, initial)` hook that wraps `useState` with a `useEffect` that reads from `localStorage` on mount and writes to `localStorage` on change. Use a single namespace prefix like `giftly-demo:` for all keys to avoid collisions.

Source data (the brand, creators, products, match-row data, Rufus responses, Amazon products) stays hardcoded in `lib/mockData.ts` and is **not persisted** — only user-action-derived state lives in localStorage.

If `localStorage` is unavailable (SSR), fall back to the initial value cleanly without crashing. Wrap reads in try/catch.

---

## Mock data file structure

Put everything in `lib/mockData.ts` exporting typed constants:

```typescript
export const BRAND: Brand = { ... };
export const CURRENT_CREATOR: Creator = { ... };
export const SUGGESTED_CREATORS: Creator[] = [ ... ];
export const IN_PROGRESS_MATCHES: Match[] = [ ... ];
export const INBOX_OFFERS: Offer[] = [ ... ];
export const MATCH_ROWS: MatchOutcome[] = [ ... ];  // 12 rows
export const PRODUCT_SUMMARY: ProductSummary[] = [ ... ];  // 3 products
export const AMAZON_PRODUCTS: AmazonProduct[] = [ ... ];  // 6 products
export const RUFUS_WITHOUT_GIFTLY: RufusResponse = { ... };
export const RUFUS_WITH_GIFTLY: RufusResponse = { ... };
```

All TypeScript types in `lib/types.ts`.

## Setup steps (incremental, in existing project)

1. Install missing shadcn primitives if needed: `npx shadcn@latest add button card badge tabs table separator input label avatar dialog`
2. `npm install lucide-react framer-motion`
3. Implement files in the structure above
4. Run dev server and verify all four pages load and persist state correctly across refreshes

## Critical correctness checklist

Before considering this done, verify:

- [ ] Existing landing page is untouched
- [ ] Brand/creator/data sections inherit the project's existing design system (do not introduce new color palettes for these sections)
- [ ] The no-obligation banner on creator-portal offer cards is the most prominent element on those cards
- [ ] The three creator-feedback options (love / don't love / still trying) are visually equal weight
- [ ] In the Rufus demo, the product grid actually re-ranks when the toggle is flipped, with smooth animation
- [ ] Lumina Pro appears in all three sections — onboarding (brand portal), match data (data view), and as the recommended product (Rufus with Giftly)
- [ ] All 5 suggested creators have all 3 "why this match" reasons populated
- [ ] All 12 match-rows have the exact data specified above
- [ ] The product-summary view shows the three products with post rates of 81% / 27% / 7.5% as bars
- [ ] User-interaction state persists across page refreshes via localStorage
- [ ] Source mock data does NOT depend on localStorage — fresh users see the full initial state immediately

## What this demo deliberately does NOT do

- No real auth — pages accessible directly
- No real shipping / tracking — "In transit" is just a status label
- No actual API calls to Amazon or any AI model — Rufus responses are hardcoded text
- No backend / database — localStorage handles only user-action state, mock data is the source of truth for static content

When in doubt about styling for the brand portal, creator portal, or data view, defer to the existing project's components and tokens. The Amazon section is the only place that should look visually distinct from the rest of the app.
