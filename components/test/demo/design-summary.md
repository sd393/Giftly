# Giftly Design System

## Foundations (shared across both surfaces)

Defined in `app/globals.css` and `app/layout.tsx`. The same tokens drive both the public marketing site and the internal dashboard — but they're applied very differently.

### Color palette
A warm, "paper + coral" palette. No dark mode in practice (a `.dark` variant exists but isn't toggled).

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#f6eee3` | Primary background |
| `cream-warm` | `#f1e6d4` | Alternating section bands, cards |
| `cream-deep` | `#eadbc3` | "Brand" path card, photo placeholders |
| `coral` | `#e55a4e` | Primary accent — CTAs, focus ring, links on hover |
| `coral-deep` | `#c84538` | Hover state, error text on the dashboard |
| `coral-pale` | `#f8c7bc` | Decorative accents on dark hero, hover bg |
| `peach` | `#fbe0cf` | Quote-card hover bg |
| `ink` | `#2a1a12` | Primary text, dark hero/CTA backgrounds |
| `ink-soft` | `#4d3828` | Body copy |
| `muted-warm` | `#8a7566` | Eyebrow labels, metadata |
| `line` | `#d9c9b3` | Hairlines and borders |

shadcn's standard semantic tokens (`--background`, `--primary`, `--card`, etc.) are remapped onto this palette in `:root`, so the shadcn primitives (Input, Select, Table, Sheet, Badge…) inherit the warm palette automatically.

### Typography
Three Google Fonts wired in via `next/font/google`:

- **Fraunces** (`--font-display`) — variable serif with `opsz` and `SOFT` axes; used in italic-light for accent words ("results", "actually", "side"). The signature voice of the brand.
- **Instrument Sans** (`--font-sans`) — body and UI default.
- **Pacifico** (`--font-script`) — declared as `--font-script` but not actually used anywhere I could see in the rendered code (likely reserved or experimental).

Type treatment patterns:
- All-lowercase copy throughout, including page titles ("for creators", "pick your side.").
- Eyebrow labels: `text-xs uppercase tracking-[0.18em] text-muted-warm font-medium` — the consistent section-opener motif.
- Display headings use fluid sizing: `clamp(2.5rem, 5vw, 4.25rem)`, with tight `leading-[0.95]` and slight negative tracking.
- Italic + light-weight Fraunces in coral is the consistent "emphasis word" pattern (`<span className="font-display italic font-light text-coral">`). Often paired with `underline`.
- Body copy on marketing: 1.05–1.2rem, `leading-[1.6–1.65]`, `text-ink-soft`, capped at ~46–60ch.

### Radii & shape language
- `--radius-pill: 9999px` — buttons in marketing CTAs.
- `--radius-card: 28px` — large path cards.
- `--radius-card-sm: 20px` — quote cards.
- shadcn uses `--radius: 0.5rem` for the dashboard primitives.
Marketing leans pill / oversized rounded card; dashboard leans `rounded-md`.

### Texture & ambience
- A fixed SVG `feTurbulence` paper-grain overlay (`body::before`, opacity 0.35, `mix-blend-mode: multiply`) sits over everything — giving the cream backgrounds a subtle physical-paper feel.
- Frosted overlays (`bg-white/90 backdrop-blur-xl`) for cards floating over imagery (hero card, marquee, forms).
- Focus ring is always `2px solid coral` with `2px offset`.

### Motion
Custom keyframes in `globals.css`:
- `marquee` (45s linear infinite — niche strip on home).
- `fade-up` and `fade-in` on `cubic-bezier(0.22, 1, 0.36, 1)` — used with staggered `animationDelay` for hero/team-card entrance.
- `pulse-dot`.
All animations are gated behind `motion-safe:`. Hover micro-interactions are `-translate-y-0.5/1` lifts plus arrow-glyph `translate-x-1`.

---

## Marketing site (public-facing)

Routes: `/`, `/about`, `/brands`, `/creators`. Layout in `app/(marketing)/layout.tsx` is a passthrough — each page composes `<Nav>`, `<main>`, `<Footer>` itself.

### Layout structure
- Full-bleed hero sections (often `h-screen` on the home page, with a giant "GIFTLY" wordmark in coral at `text-[24vw]` clipped along the bottom).
- Subsequent sections alternate `bg-cream` ↔ `bg-cream-warm` for rhythm.
- Content max-width: `1400px`, padded `px-5 md:px-10`.
- Vertical rhythm: sections use `py-20 md:py-32` or larger.
- Two-column "thesis" pattern: `grid-cols-1 md:grid-cols-[1fr_1.3fr]` with a full-bleed pull quote bordered by a 4px coral bar (`absolute left-0 w-1 bg-coral`).

### Components (`components/site/`)
- **Nav** — fixed top, `bg-white/90 backdrop-blur-xl`, gains a hairline `border-line` on scroll. Logo on left, nav links centered, `log in` right-aligned. Underline-grow hover effect (`after:w-0 → after:w-full` with 300ms transition).
- **Footer** — 4-column grid (logo+blurb, platform, resources, follow), uppercase 0.18em-tracked eyebrow headings, "made with *care* in california + new hampshire" closing.
- **PathCard** — large `min-h-[480px]` rounded `rounded-card` cards with two color variants:
  - `creator` → `bg-coral text-cream`
  - `brand` → `bg-cream-deep text-ink`
  Internally: 0.2em-tracked uppercase label, big display headline with italic-light accent, numbered bullet list separated by `border-t/border-b border-current` hairlines, pill CTA.
- **QuoteCard** — `rounded-card-sm`, two variants (default cream-warm, coral). Uses an oversized `font-display` left-double-quote glyph as a visual stamp.
- **Logo** — height-driven sizing (`sm/md/lg/xl`) wrapping `/logo.svg`.

### Forms (creator/brand application)
- Floating frosted card (`bg-white/90 backdrop-blur-xl p-7 md:p-10`).
- shadcn Form + react-hook-form + zod (`@hookform/resolvers/zod`).
- Niche selector is a custom pill toggle: rounded-full, coral fill when active, otherwise `border-line` with coral hover.
- Submission via Server Action → Resend email; success state replaces the form with a centered checkmark, italic Fraunces "thanks. we'll be in touch.", and a back-link.
- Errors surface through a global `<Toaster position="top-center" />` (sonner).

### Marketing button language
Most marketing CTAs are *raw `<Link>`s with hand-applied classes* rather than the shadcn Button — bare `bg-coral text-white px-7 py-4`, with a `→` glyph that translates on hover. The `<Button>` component is mostly used in form submits and on the dashboard.

---

## Internal dashboard (`/platform`)

Routes: `/login`, then under an authed shell `/`, `/creators`, `/creators/[id]`, `/creators/new`, `/brands`, `/brands/[id]`, `/outbound`, `/import`, `/settings`. Domain-restricted to `@trygiftly.com` Supabase users (enforced both in middleware and in `(authed)/layout.tsx`).

### Layout shell
`app/platform/(authed)/layout.tsx`:
- App-shell with a 224px (`w-56`) fixed left sidebar (`hidden md:flex`, hairline `border-line/60`, `bg-white/60`).
- Sidebar header: small "giftly" wordmark in `font-display`, `internal` micro-label.
- Sidebar nav (`SidebarNav`): vertical link list, active item gets `text-coral bg-coral/10` plus a 2px coral rail on the left edge (`absolute left-0 top-1.5 bottom-1.5 w-0.5`).
- Footer of sidebar: truncated user email + sign-out button.
- Main column: `flex-1 min-w-0`, pages pad `px-6 md:px-10 py-8`.

### Page chrome
- Every page opens with `<PageHeader title subtitle />` — `font-display text-[1.75rem] tracking-tight` heading with a tiny `muted-warm` subtitle. Detail pages add a breadcrumb (`creators / Name`) above and an `<H1>` at `2rem`.
- Section headings inside pages use the same tracked-uppercase eyebrow pattern as marketing: `text-[0.75rem] uppercase tracking-[0.15em] text-muted-warm font-medium`.

### Density and typographic scale
The dashboard explicitly runs ~1px-2px tighter than typical shadcn defaults — pixel-precise sizes via arbitrary values:
- Body: `text-[0.9rem]`
- Secondary text: `text-[0.85rem]` / `text-[0.8rem]`
- Metadata: `text-[0.75rem]` / `text-[0.7rem]`
- Badge text: `text-[0.65rem]` (often uppercase, `tracking-[0.1em]`)
- Buttons: `size="sm"` is the default in this surface (`px-4 py-2 text-sm`).

This produces a noticeably compact, list-heavy UI.

### Recurring patterns
- **Card row** (used in inbound, creators table, brands table, in-talks, activity timeline): `bg-white border border-line/60 rounded-md p-4 flex items-start gap-4`. A flexbox with a `flex-1 min-w-0` content side and a `shrink-0` action stack on the right.
- **Inline badge stack** above the title: `kind`, `new` / `archived` / `reviewed`, plus a `relativeTime(...)` helper rendering "just now / Nm ago / Nh ago / Nd ago".
- **Filter bar** (`CreatorsFilters`, `MessagesFilters`): `flex flex-wrap items-center gap-3 mb-4` with a 256px search input and several `w-32–w-40 h-9` Select dropdowns. Filter changes use `useTransition` + `router.replace` to push state into searchParams without a full reload.
- **Detail pages**: max width `1100px`, sectioned with eyebrow-style headings and a final "activity" timeline that merges messages, tasks, and the `record created` event.
- **Message detail Sheet** (right-side drawer via shadcn `Sheet`): Meta grid at the top, `<pre>` body in `bg-cream-warm/50` with a font-sans monospace-feel block, status mutation buttons at the bottom. The same warm palette bleeds into table rows and code blocks — no neutral gray escape hatch.
- **Login page**: minimalist centered card on cream, "internal" eyebrow under the wordmark, error state painted in `bg-coral/5 border-coral/30 text-coral-deep`.

### shadcn primitives leaned on
`Button`, `Badge`, `Input`, `Select`, `Sheet`, `Table`, `Form`, `Accordion`, `Toaster` (sonner), `Dialog`. Icons are lucide-react. The `Button` component itself is heavily customized — it carries the *marketing* design language (rounded-full, ink → coral lift, multiple custom variants like `coral`, `on-coral`, `on-ink`) rather than vanilla shadcn.

---

## Design principles you can read out of the code

1. **Editorial, not utilitarian.** The marketing surface is set like a magazine — fluid display type in a serif with italic accent words, generous vertical air, paper-grain texture, and section-defining pull quotes. The dashboard inherits the same palette and headings but tightens everything down to data-density.
2. **One palette, two intensities.** Marketing uses big coral fills and dark `ink` heroes; the dashboard uses coral *sparingly* — only as the active-state and hover accent — and lets `bg-white` + `border-line/60` rows do the work.
3. **Lowercase voice, all-the-way down.** Page titles, nav labels, button copy, even success toasts ("marked reviewed", "archived"). It's a deliberate brand voice extending into the internal tool.
4. **Italic-light Fraunces in coral as the only "decorative" move.** Used consistently for the emphasized noun in every hero, every section title, and even the closing footer line.
5. **Frosted-card-on-cream as the layered surface.** `bg-white/90 backdrop-blur-xl` for hero overlays, nav, marquee, and forms — and `bg-white border border-line/60 rounded-md` is the dashboard's flatter version of the same idea.
6. **Hairline borders, never shadows.** Most cards rely on `border-line/60` rather than drop shadows; subtle shadows appear only on hover lifts and the team cards. Corollary: visual hierarchy comes from spacing and type weight, not from depth.
7. **Hover lift + arrow-glyph translate** is the universal interactive vocabulary on marketing.
8. **shadcn New York + neutral base, fully retokenized.** The base `components.json` says `neutral`, but every shadcn semantic var is overridden onto Giftly's warm palette in `:root`, so primitives feel native rather than bolted on.
9. **Accessible defaults.** Skip-to-content link in `app/layout.tsx`, `motion-safe:` gates on every animation, `aria-current="page"`, focus-visible coral outline, `aria-hidden` on decorative glyphs (the `✶`, `→`, oversized quote marks).
