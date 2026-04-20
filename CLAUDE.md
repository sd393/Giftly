# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (both `pnpm-lock.yaml` and `package-lock.json` exist; prefer pnpm to match the committed lockfile).

- `pnpm dev` — start Next.js dev server
- `pnpm build` — production build
- `pnpm start` — run the built app
- `pnpm lint` — ESLint on the repo
- `pnpm exec tsc --noEmit` — type-check explicitly. **This matters:** `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so `pnpm build` will silently succeed on broken types. Run `tsc` yourself before calling work done.

No test framework is configured.

## Architecture

Single-page marketing site plus a creator application form. Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind v4, shadcn/ui.

### Form submission flow (the one non-trivial flow)

The `/creator` form is the end-to-end pattern to follow when adding new forms:

1. **Schema** — `lib/schemas/creator.ts` defines a Zod schema + inferred TS type. The schema is the single source of truth; both client validation and server-action validation re-parse against it.
2. **Client form** — `app/creator/_components/creator-form.tsx` is a `"use client"` component using `react-hook-form` + `@hookform/resolvers/zod`. It imports the server action directly and calls it from `onSubmit`.
3. **Server action** — `app/actions/submit-creator.ts` is `"use server"`, re-validates with `safeParse`, then sends an email via Resend. HTML fields are escaped with a local `escapeHtml` helper — do the same for any new user-supplied content rendered into email HTML.
4. Errors surface through `sonner` toasts (mounted globally in `app/layout.tsx`); success flips local state to show a confirmation view.

Env var required for form submissions: `RESEND_API_KEY`. The `from` address is `onboarding@resend.dev` (Resend's shared sandbox sender) and the `to` recipient is hardcoded in `submit-creator.ts` — update both when wiring a real domain.

### Styling / UI

- **Tailwind v4, CSS-first config.** There is no `tailwind.config.*`. Theme tokens and `@theme inline` live in `app/globals.css`, colors use `oklch()`, dark mode via `.dark` class. Add design tokens there, not in a JS config.
- **shadcn/ui** (`new-york` style, `neutral` base, Lucide icons) — see `components.json`. Components live in `components/ui/`; add new ones with `pnpm dlx shadcn@latest add <name>` rather than hand-rolling.
- Path alias `@/*` maps to the project root (see `tsconfig.json`), so imports use `@/components/ui/...`, `@/lib/...`, `@/hooks/...`.

### Other notes

- `app/layout.tsx` conditionally mounts `@vercel/analytics` only in production and globally renders `<Toaster position="top-center" />` from sonner.
- `next.config.mjs` also sets `images.unoptimized: true`.
- `outreach/` is an untracked working directory — treat it as the user's scratch space, not part of the app.
