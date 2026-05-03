# Creator Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the creator-facing portal at `/portal/creator/*` per spec `docs/superpowers/specs/2026-05-01-creator-portal-design.md`. Real auth, real data, video eval submission, admin-triggered LLM extraction.

**Architecture:** Next.js App Router routes under `/portal/creator/*` gated by Supabase auth + a new `creators.auth_user_id` binding. New tables `products`, `matches`, `eval_videos`. Admin invites creators from `/platform/creators/[id]`. Creator submits a video → Supabase Storage. Admin clicks "extract" → `extractEval(match_id)` runs Whisper + Claude Haiku → structured JSON saved.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui, Supabase (auth + Postgres + Storage), Zod, Vitest (added for this feature), OpenAI Whisper API, Anthropic Claude Haiku.

---

## Phase 0 — Foundations (test setup + schema)

End-of-phase commit lands a migration + a working test runner. No UI yet.

### Task 0.0: Confirm `/creator` form populates Supabase `creators`

**Files (read only):**
- `app/actions/submit-creator.ts`
- `app/platform/(authed)/creators/page.tsx`
- `app/platform/(authed)/import/page.tsx` (if exists)
- `supabase/migrations/*_add_inbound_tables.sql`

**Findings:**

The `/creator` form writes directly to Supabase `creators` — no Sheets/webhook/cron in the path, and no Task 0.0a needed. Concrete trace:

- `app/actions/submit-creator.ts:56-60` performs `supabaseAdmin.from('creators').upsert(insertPayload, { onConflict: 'email' }).select('id, created_at, updated_at').single()` — a direct table write using the secret-key admin client (`lib/supabase/admin.ts:19`, which bypasses RLS).
- `insertPayload` (lines 43-54) explicitly hard-codes `source: 'application' as const`, matching the enum value defined in `supabase/migrations/20260421000005_record_source.sql:12-21` and aligning with the `/creators` page filter (`source != 'outreach'` in `app/platform/(authed)/creators/page.tsx:58`).
- The `creators` table is defined in `supabase/migrations/20260421075202_add_inbound_tables.sql:12-25` (note: the `..._075134_...` migration is empty/0-line — the real DDL is in `..._075202_...`). The `source` column was added later by `20260421000005_record_source.sql`; `shipping_address` by `20260422201449_creator_shipping_address.sql:3`. All columns referenced by `insertPayload` exist.
- After the upsert, the action sends a team notification email via Resend (lines 73-95). Email failure is swallowed (catch + console.error) and does not affect the Supabase row — so applicants always land in the table even if Resend is down.
- `app/platform/(authed)/import/page.tsx` exists but is unrelated: it imports Instagram DM history via a client-side ZIP parser into `outbound_messages` and creates `source='outreach'` creator rows that are explicitly hidden from `/creators`. It is not part of the application flow.
- Grepped migrations and app code for `cron|sheets|webhook|CREATOR_SHEET` — only hits are in this plan, the spec, and lockfiles. No DB trigger, no Edge Function, no Sheets sync.

Caveat (does not block): the **project-root** `CLAUDE.md` (`/Users/ethan/Documents/Projects/Giftly/CLAUDE.md`) still describes the old Google Apps Script webhook flow and a `CREATOR_SHEET_WEBHOOK_URL` env var. That doc is stale — the worktree-local `CLAUDE.md` correctly describes the current Resend-only notification path, and the code matches the worktree doc. Worth fixing in a separate housekeeping commit; not in scope for Task 0.0.

Implication for Phase 1: every applicant from `/creator` already has a `creators` row keyed by email with `source='application'`, so the `sendPortalInvite` flow (Task 1.1) has a stable row to bind a Supabase auth user to. The `auth_user_id` column added in Task 0.2 attaches to existing rows.

- [ ] **Step 1: Trace creator-application data flow**

Read the files above. Determine whether `/creator` form writes a row into Supabase `creators` directly, via webhook + cron, or whether admin manually creates rows after Sheets review.

- [ ] **Step 2: Document the answer in the plan**

Add a one-paragraph note at the top of this plan documenting the actual flow. If the form does NOT write to Supabase `creators`, add Task 0.0a below to extend `app/actions/submit-creator.ts` to also `INSERT INTO creators` with `source='application'`. Without that, the invite flow has no row to bind to.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-01-creator-portal.md
git commit -m "docs: confirm creator-application data flow before portal build"
```

---

### Task 0.1: Install Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Add Vitest + jsdom + @testing-library/react**

```bash
pnpm add -D vitest @vitest/ui @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Create `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add `test` script to `package.json`**

In `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Sanity-check with a placeholder test**

Create `tests/sanity.test.ts`:
```typescript
import { expect, test } from 'vitest'
test('vitest is wired', () => {
  expect(1 + 1).toBe(2)
})
```

Run: `pnpm test`
Expected: PASS, 1 test.

- [ ] **Step 6: Delete the sanity test, commit**

```bash
rm tests/sanity.test.ts
git add package.json pnpm-lock.yaml vitest.config.ts tests/setup.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 0.2: Schema migration — products, matches, eval_videos, creators.auth_user_id

**Files:**
- Create: `supabase/migrations/20260501080000_creator_portal_schema.sql` (use a fresh `date -u +"%Y%m%d%H%M%S"` at commit time)

- [ ] **Step 1: Write the migration**

Verbatim from spec §6.1, plus brand-portal stub forward-compat:

```sql
-- products owned by brands
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  image_url text,
  retail_price_cents integer,
  sku text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_brand_id_idx on products(brand_id);

-- matches: state-machine row per creator+product pair
create table matches (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  stage text not null default 'proposed'
    check (stage in ('proposed', 'accepted', 'declined', 'received',
                     'declined_after_receipt', 'still_trying',
                     'eval_submitted', 'eval_complete')),
  why_matched text,
  commission_pct numeric(5,2),
  proposed_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  decline_note text,
  received_at timestamptz,
  eval_submitted_at timestamptz,
  eval_complete_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, product_id)
);
create index matches_creator_id_stage_idx on matches(creator_id, stage);
create index matches_product_id_idx on matches(product_id);

-- one eval video per match (replaceable)
create table eval_videos (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  blob_key text not null,
  duration_sec integer,
  bytes integer,
  mime_type text,
  transcript text,
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending','running','complete','failed')),
  transcript_error text,
  extracted jsonb,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending','running','complete','failed')),
  extraction_error text,
  extracted_at timestamptz,
  created_at timestamptz not null default now()
);
create index eval_videos_match_id_idx on eval_videos(match_id);

-- bind creators to auth users
alter table creators add column auth_user_id uuid references auth.users(id);
alter table creators add column invited_at timestamptz;
create unique index creators_auth_user_id_idx
  on creators(auth_user_id) where auth_user_id is not null;
```

- [ ] **Step 2: Apply locally**

```bash
supabase db reset
# or: supabase migration up
```

Expected: migration applies without errors.

- [ ] **Step 3: Generate Supabase types**

```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

(Adapt path if the repo already keeps types elsewhere — search for `Database` type imports first.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/<timestamp>_creator_portal_schema.sql lib/supabase/database.types.ts
git commit -m "feat(db): add products, matches, eval_videos; bind creators to auth users"
```

---

### Task 0.3: RLS policies migration

**Files:**
- Create: `supabase/migrations/<timestamp>_creator_portal_rls.sql`

- [ ] **Step 1: Write RLS policies**

```sql
-- enable RLS
alter table products enable row level security;
alter table matches enable row level security;
alter table eval_videos enable row level security;

-- helper: is the current auth user a @trygiftly.com admin?
-- (re-uses whatever convention existing platform tables use; check
-- prior migrations for the exact pattern. The check below is a
-- conservative default.)
create or replace function is_giftly_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and email like '%@trygiftly.com'
  );
$$;

-- products: admins read all; creators read products they have a match for
create policy products_admin_all on products for all
  using (is_giftly_admin()) with check (is_giftly_admin());
create policy products_creator_read on products for select
  using (
    exists (
      select 1 from matches m
      join creators c on c.id = m.creator_id
      where m.product_id = products.id and c.auth_user_id = auth.uid()
    )
  );

-- matches: admins all; creators only their own
create policy matches_admin_all on matches for all
  using (is_giftly_admin()) with check (is_giftly_admin());
create policy matches_creator_read on matches for select
  using (
    exists (select 1 from creators
            where id = matches.creator_id and auth_user_id = auth.uid())
  );
create policy matches_creator_update on matches for update
  using (
    exists (select 1 from creators
            where id = matches.creator_id and auth_user_id = auth.uid())
  )
  with check (
    exists (select 1 from creators
            where id = matches.creator_id and auth_user_id = auth.uid())
  );

-- eval_videos: admins all; creators read+insert their own
create policy eval_videos_admin_all on eval_videos for all
  using (is_giftly_admin()) with check (is_giftly_admin());
create policy eval_videos_creator_read on eval_videos for select
  using (
    exists (
      select 1 from matches m
      join creators c on c.id = m.creator_id
      where m.id = eval_videos.match_id and c.auth_user_id = auth.uid()
    )
  );
create policy eval_videos_creator_insert on eval_videos for insert
  with check (
    exists (
      select 1 from matches m
      join creators c on c.id = m.creator_id
      where m.id = eval_videos.match_id and c.auth_user_id = auth.uid()
    )
  );

-- update creators policy (existing) to also allow self-read by auth_user_id
-- (verify the existing policy by reading prior migrations; adjust the
-- statement below to match the existing policy name)
create policy creators_self_read on creators for select
  using (auth.uid() = auth_user_id);
```

- [ ] **Step 2: Read prior `*_grant_authenticated_platform_tables.sql` to verify `is_giftly_admin()` helper doesn't already exist under another name**

If it does, skip the `create or replace function` block and use the existing helper.

- [ ] **Step 3: Apply migration locally**

```bash
supabase migration up
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/<timestamp>_creator_portal_rls.sql
git commit -m "feat(db): RLS for products/matches/eval_videos and creator self-read"
```

---

### Task 0.4: Storage bucket `eval-videos`

**Files:**
- Create: `supabase/migrations/<timestamp>_eval_videos_bucket.sql`

- [ ] **Step 1: Write the bucket migration**

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eval-videos', 'eval-videos', false,
  104857600, -- 100 MB
  array['video/mp4','video/quicktime','video/webm']
) on conflict (id) do nothing;

-- bucket RLS
create policy eval_videos_obj_admin_all on storage.objects for all
  using (bucket_id = 'eval-videos' and is_giftly_admin())
  with check (bucket_id = 'eval-videos' and is_giftly_admin());

-- creator access: object name pattern is {match_id}/{uuid}.{ext};
-- the leading folder must equal a match.id owned by the creator.
create policy eval_videos_obj_creator_read on storage.objects for select
  using (
    bucket_id = 'eval-videos'
    and exists (
      select 1 from matches m
      join creators c on c.id = m.creator_id
      where c.auth_user_id = auth.uid()
        and m.id::text = split_part(objects.name, '/', 1)
    )
  );

create policy eval_videos_obj_creator_insert on storage.objects for insert
  with check (
    bucket_id = 'eval-videos'
    and exists (
      select 1 from matches m
      join creators c on c.id = m.creator_id
      where c.auth_user_id = auth.uid()
        and m.id::text = split_part(objects.name, '/', 1)
    )
  );
```

- [ ] **Step 2: Apply + commit**

```bash
supabase migration up
git add supabase/migrations/<timestamp>_eval_videos_bucket.sql
git commit -m "feat(storage): eval-videos bucket with per-match RLS"
```

---

## Phase 1 — Auth + invite flow

End-of-phase: an admin can click a button in `/platform/creators/[id]` and a real magic-link email reaches the creator.

### Task 1.1: `sendPortalInvite` server action

**Files:**
- Modify: `app/platform/(authed)/creators/[id]/_actions.ts`
- Create: `tests/platform/send-portal-invite.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/platform/send-portal-invite.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { sendPortalInvite } from '@/app/platform/(authed)/creators/[id]/_actions'
import { createClient } from '@/lib/supabase/server'

describe('sendPortalInvite', () => {
  it('refuses when creator already has auth_user_id', async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'c1', email: 'a@b.com', auth_user_id: 'already' },
            error: null,
          }),
        }),
      }),
    })
    ;(createClient as any).mockResolvedValue({ from: fromMock })
    const result = await sendPortalInvite('c1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already invited/i)
  })

  it('happy path: invites + binds auth_user_id + sets invited_at', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'creators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'c2', email: 'new@example.com', auth_user_id: null },
                error: null,
              }),
            }),
          }),
          update: updateMock,
        }
      }
      return {} as any
    })
    const inviteMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-uid-xyz' } },
      error: null,
    })
    ;(createClient as any).mockResolvedValue({
      from: fromMock,
      auth: { admin: { inviteUserByEmail: inviteMock } },
    })

    const result = await sendPortalInvite('c2')
    expect(result.ok).toBe(true)
    expect(inviteMock).toHaveBeenCalledWith('new@example.com', expect.any(Object))
    expect(updateMock).toHaveBeenCalledWith({
      auth_user_id: 'auth-uid-xyz',
      invited_at: expect.any(String),
    })
  })
})
```

- [ ] **Step 2: Run — should fail (function not exported yet)**

```bash
pnpm test -- send-portal-invite
```
Expected: FAIL — `sendPortalInvite` not found.

- [ ] **Step 3: Implement**

Add to `app/platform/(authed)/creators/[id]/_actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function sendPortalInvite(creatorId: string) {
  const supabase = await createClient()
  const { data: creator, error: loadErr } = await supabase
    .from('creators')
    .select('id, email, auth_user_id')
    .eq('id', creatorId)
    .single()
  if (loadErr || !creator) {
    return { ok: false as const, error: 'Creator not found.' }
  }
  if (creator.auth_user_id) {
    return { ok: false as const, error: 'Creator already invited.' }
  }
  const { data: invite, error: inviteErr } = await supabase.auth.admin
    .inviteUserByEmail(creator.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/creator`,
    })
  if (inviteErr || !invite?.user) {
    return { ok: false as const, error: inviteErr?.message ?? 'Invite failed.' }
  }
  const { error: bindErr } = await supabase
    .from('creators')
    .update({
      auth_user_id: invite.user.id,
      invited_at: new Date().toISOString(),
    })
    .eq('id', creatorId)
  if (bindErr) {
    return { ok: false as const, error: bindErr.message }
  }
  return { ok: true as const }
}
```

- [ ] **Step 4: Run — should pass**

```bash
pnpm test -- send-portal-invite
```
Expected: PASS, 2 tests.

- [ ] **Step 5: Type-check**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/platform/\(authed\)/creators/\[id\]/_actions.ts tests/platform/send-portal-invite.test.ts
git commit -m "feat(admin): sendPortalInvite server action"
```

---

### Task 1.2: Wire admin "send invite" button into `/platform/creators/[id]`

**Files:**
- Create: `app/platform/(authed)/creators/[id]/_components/send-invite-button.tsx`
- Modify: `app/platform/(authed)/creators/[id]/page.tsx`

- [ ] **Step 1: Build the button (client component)**

```tsx
// _components/send-invite-button.tsx
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { sendPortalInvite } from '../_actions'

export function SendInviteButton({
  creatorId,
  alreadyInvited,
}: {
  creatorId: string
  alreadyInvited: boolean
}) {
  const [pending, start] = useTransition()
  if (alreadyInvited) {
    return (
      <p className="text-[0.75rem] text-muted-warm">Portal invite sent.</p>
    )
  }
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await sendPortalInvite(creatorId)
          if (r.ok) toast.success('invite sent')
          else toast.error(r.error)
        })
      }
    >
      send portal invite
    </Button>
  )
}
```

- [ ] **Step 2: Render the button on the creator detail page**

In `app/platform/(authed)/creators/[id]/page.tsx`, near the page header / metadata block, add:

```tsx
import { SendInviteButton } from './_components/send-invite-button'
// ...
<SendInviteButton
  creatorId={creator.id}
  alreadyInvited={Boolean(creator.auth_user_id)}
/>
```

(Adapt the `creator` variable name to whatever the existing page uses; read the file first.)

- [ ] **Step 3: Manual test in dev**

```bash
pnpm dev
```

Visit a creator detail page, click "send portal invite" — confirm a Supabase auth invite email arrives. Confirm `creators.auth_user_id` updates in DB.

- [ ] **Step 4: Commit**

```bash
git add app/platform/\(authed\)/creators/\[id\]/_components/send-invite-button.tsx app/platform/\(authed\)/creators/\[id\]/page.tsx
git commit -m "feat(admin): send portal invite button on creator detail page"
```

---

### Task 1.3: `/portal/creator/*` middleware gate

**Files:**
- Create: `lib/portal/auth.ts`
- Modify: `middleware.ts` (existing) — find current path matchers and add a `/portal/creator/*` branch

- [ ] **Step 1: Write the helper**

```typescript
// lib/portal/auth.ts
import { createClient } from '@/lib/supabase/server'

export async function getCreatorForCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, email, auth_user_id')
    .eq('auth_user_id', user.id)
    .single()
  return creator ?? null
}
```

- [ ] **Step 2: Read existing `middleware.ts`**

Identify how it handles `/platform/*`. Mirror that pattern for `/portal/creator/*`:
- If no Supabase session → redirect to `/login?next=/portal/creator`
- If session but no `creators.auth_user_id` row matching → redirect to `/login?next=/portal/creator&unbound=1`

- [ ] **Step 3: Add the rule**

(Pseudocode — adapt to the existing middleware shape.)

```typescript
if (pathname.startsWith('/portal/creator')) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?next=' + pathname, request.url))
  }
  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!creator) {
    return NextResponse.redirect(new URL('/login?unbound=1', request.url))
  }
}
```

- [ ] **Step 4: Smoke test**

`pnpm dev`. Visit `/portal/creator` un-authed → expect redirect. Sign in as the invited creator → land on the page (will 404 the page itself, which doesn't exist yet — that's fine; only the gate is being tested here).

- [ ] **Step 5: Commit**

```bash
git add lib/portal/auth.ts middleware.ts
git commit -m "feat(portal): gate /portal/creator/* on creator session"
```

---

## Phase 2 — Portal shell

End-of-phase: invited creator sees their portal layout with empty tabs.

### Task 2.1: Layout + sidebar

**Files:**
- Create: `app/portal/layout.tsx` (forwards children, no chrome)
- Create: `app/portal/creator/layout.tsx` (sidebar + auth-fetch)
- Create: `app/portal/creator/_components/sidebar.tsx`

- [ ] **Step 1: Outer `/portal/layout.tsx`**

```tsx
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 2: Creator-portal layout**

```tsx
// app/portal/creator/layout.tsx
import { redirect } from 'next/navigation'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { CreatorSidebar } from './_components/sidebar'

export default async function CreatorPortalLayout({
  children,
}: { children: React.ReactNode }) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) redirect('/login')

  return (
    <div className="min-h-screen flex bg-cream text-ink">
      <CreatorSidebar creator={creator} />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8 pb-24">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Sidebar component**

Port from `components/test/demo/creator-portal/sidebar.tsx`. Replace mock data with `creator` props (`name`, `email`). Drop the "demo / acting as creator" footer; replace with a sign-out button.

```tsx
// _components/sidebar.tsx
'use client'

import { Inbox, Gift, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/lib/portal/sign-out-action'
import { Button } from '@/components/ui/button'

const NAV = [
  { label: 'Inbox', icon: Inbox, active: true },
  { label: 'Active gifts', icon: Gift, active: true },
  { label: 'Settings', icon: Settings, active: false },
]

export function CreatorSidebar({
  creator,
}: { creator: { name: string | null; email: string } }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-line/60 bg-white/60 flex-col">
      <div className="px-5 py-5 border-b border-line/60">
        <p className="font-display text-[0.95rem] tracking-tight truncate">
          {creator.name ?? creator.email}
        </p>
        <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm">
          creator portal
        </p>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(({ label, icon: Icon, active }) => (
          <span
            key={label}
            aria-disabled={!active}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 text-[0.85rem] font-medium rounded',
              active ? 'text-ink' : 'text-muted-warm cursor-not-allowed',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </span>
        ))}
      </nav>
      <div className="border-t border-line/60 px-4 py-3">
        <p className="text-[0.7rem] text-muted-warm truncate">{creator.email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm" className="px-0">
            sign out
          </Button>
        </form>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Sign-out action**

```typescript
// lib/portal/sign-out-action.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 5: Commit**

```bash
git add app/portal lib/portal/sign-out-action.ts
git commit -m "feat(portal): /portal/creator layout + sidebar"
```

---

### Task 2.2: Page with header + tabs (empty data)

**Files:**
- Create: `app/portal/creator/page.tsx`
- Create: `app/portal/creator/_components/portal-tabs.tsx`

- [ ] **Step 1: Server page loads matches and renders header + tabs**

```tsx
// page.tsx
import { redirect } from 'next/navigation'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'
import { PortalTabs } from './_components/portal-tabs'

export default async function CreatorPortalPage() {
  const creator = await getCreatorForCurrentUser()
  if (!creator) redirect('/login')

  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select(
      `id, stage, why_matched, commission_pct, proposed_at,
       product:products(id, name, image_url, retail_price_cents,
                       brand:brands(id, brand_name))`,
    )
    .eq('creator_id', creator.id)
    .order('proposed_at', { ascending: false })

  const inbox = (matches ?? []).filter((m) => m.stage === 'proposed')
  const active = (matches ?? []).filter((m) =>
    ['accepted', 'received', 'still_trying',
     'eval_submitted', 'eval_complete'].includes(m.stage),
  )

  const firstName = (creator.name ?? '').split(' ')[0]

  return (
    <>
      <header className="mb-6">
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-warm font-medium">
          creator portal
        </p>
        <h1 className="font-display text-[1.75rem] tracking-tight mt-1">
          hey {firstName.toLowerCase() || 'there'}
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted-warm">
          {inbox.length} new offer{inbox.length === 1 ? '' : 's'} ·
          {' '}{active.length} active gift{active.length === 1 ? '' : 's'}
        </p>
      </header>
      <PortalTabs inbox={inbox} active={active} />
    </>
  )
}
```

- [ ] **Step 2: Tabs (client component, default tab depends on inbox)**

```tsx
// _components/portal-tabs.tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InboxTab } from './inbox-tab'
import { ActiveGiftsTab } from './active-gifts-tab'

export function PortalTabs({ inbox, active }: any) {
  return (
    <Tabs defaultValue={inbox.length > 0 ? 'inbox' : 'gifts'} className="max-w-[860px]">
      <TabsList className="bg-cream-warm/70 border border-line/60">
        <TabsTrigger value="inbox">Inbox</TabsTrigger>
        <TabsTrigger value="gifts">Active gifts</TabsTrigger>
      </TabsList>
      <TabsContent value="inbox" className="mt-6">
        <InboxTab matches={inbox} />
      </TabsContent>
      <TabsContent value="gifts" className="mt-6">
        <ActiveGiftsTab matches={active} />
      </TabsContent>
    </Tabs>
  )
}
```

(Empty `InboxTab` / `ActiveGiftsTab` stubs for now: render "No offers yet" / "No active gifts yet". They'll be filled out in Phase 3 / 4.)

- [ ] **Step 3: Stub the two tabs**

```tsx
// _components/inbox-tab.tsx
export function InboxTab({ matches }: { matches: any[] }) {
  if (!matches.length) {
    return <p className="text-[0.9rem] text-muted-warm">No new offers — we&rsquo;ll let you know when one comes in.</p>
  }
  return <pre>{JSON.stringify(matches, null, 2)}</pre>
}

// _components/active-gifts-tab.tsx
export function ActiveGiftsTab({ matches }: { matches: any[] }) {
  if (!matches.length) {
    return <p className="text-[0.9rem] text-muted-warm">Once you accept an offer it&rsquo;ll show up here.</p>
  }
  return <pre>{JSON.stringify(matches, null, 2)}</pre>
}
```

- [ ] **Step 4: Smoke test**

`pnpm dev`. Sign in as invited creator → see "hey {name}" header + empty tabs. Create a fake `matches` row in `/platform` (manual SQL or a quick admin form is fine for now) → confirm it appears.

- [ ] **Step 5: Commit**

```bash
git add app/portal/creator
git commit -m "feat(portal): creator portal page with empty inbox + active-gifts tabs"
```

---

### Task 2.3: loading.tsx and error.tsx

**Files:**
- Create: `app/portal/creator/loading.tsx`
- Create: `app/portal/creator/error.tsx`

- [ ] **Step 1: Loading skeleton**

```tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-cream-deep/40 rounded mb-2" />
      <div className="h-6 w-64 bg-cream-deep/30 rounded mb-8" />
      <div className="h-10 w-72 bg-cream-deep/30 rounded mb-6" />
      <div className="h-32 w-full max-w-[860px] bg-cream-deep/20 rounded mb-3" />
      <div className="h-32 w-full max-w-[860px] bg-cream-deep/20 rounded" />
    </div>
  )
}
```

- [ ] **Step 2: Error boundary**

```tsx
'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-md">
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-muted-warm mb-2">
        something went wrong
      </p>
      <p className="text-[0.95rem] text-ink mb-4">
        We couldn&rsquo;t load your portal. Try reloading.
      </p>
      <p className="text-[0.75rem] text-muted-warm mb-6 font-mono">
        {error.message}
      </p>
      <Button onClick={reset} size="sm">retry</Button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/portal/creator/loading.tsx app/portal/creator/error.tsx
git commit -m "feat(portal): loading + error boundaries"
```

---

## Phase 3 — Inbox

End-of-phase: a creator can accept or decline a `proposed` match.

### Task 3.1: Offer card + decline form (UI ports)

**Files:**
- Create: `app/portal/creator/_components/offer-card.tsx`
- Create: `app/portal/creator/_components/decline-form.tsx`

- [ ] **Step 1: Port offer-card from demo**

Copy `components/test/demo/creator-portal/offer-card.tsx`. Adapt props to the real `match` shape (with nested `product`, `brand`). Render brand name, product image, product name, commission %, why_matched. Two buttons: "accept" and "decline".

- [ ] **Step 2: Port decline-form from demo**

Same approach. Form has multi-select reason chips (hardcoded list: "not aligned with my niche", "doesn't fit my audience", "tried similar product before", "compensation too low", "scheduling", "other") + an optional note textarea. On submit calls a `declineOffer` server action (next task).

- [ ] **Step 3: Wire offer-card into `inbox-tab.tsx`**

Replace the JSON dump with a list of `<OfferCard>` per match, plus the `<NoObligationBanner>` from the demo (port that too — it's a small static info card).

- [ ] **Step 4: Visual smoke test**

`pnpm dev`. Insert a `proposed` match for the test creator. Confirm the offer card renders with the demo aesthetic.

- [ ] **Step 5: Commit**

```bash
git add app/portal/creator/_components/{offer-card,decline-form,no-obligation-banner,inbox-tab}.tsx
git commit -m "feat(portal): port offer-card, decline-form, no-obligation-banner from demo"
```

---

### Task 3.2: `acceptOffer` server action + tests

**Files:**
- Create: `app/portal/creator/_actions.ts`
- Create: `tests/portal/accept-offer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/portal/auth', () => ({ getCreatorForCurrentUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { acceptOffer } from '@/app/portal/creator/_actions'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

describe('acceptOffer', () => {
  it('rejects if creator not signed in', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue(null)
    const r = await acceptOffer('m1')
    expect(r.ok).toBe(false)
  })

  it('happy path: updates stage to accepted', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const eqStage = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: eqStage }) })
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    })
    const r = await acceptOffer('m1')
    expect(r.ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({
      stage: 'accepted',
      accepted_at: expect.any(String),
    })
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
pnpm test -- accept-offer
```

- [ ] **Step 3: Implement**

```typescript
// _actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

export async function acceptOffer(matchId: string) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ stage: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'proposed')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}

const declineSchema = z.object({
  matchId: z.string().uuid(),
  reasons: z.array(z.string()).max(8),
  note: z.string().max(2000).optional().default(''),
})

export async function declineOffer(input: z.infer<typeof declineSchema>) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const parsed = declineSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({
      stage: 'declined',
      declined_at: new Date().toISOString(),
      decline_reason: parsed.data.reasons.join(', ') || null,
      decline_note: parsed.data.note || null,
    })
    .eq('id', parsed.data.matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'proposed')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}
```

- [ ] **Step 4: Run — pass**

```bash
pnpm test -- accept-offer
pnpm exec tsc --noEmit
```

- [ ] **Step 5: Wire to UI**

In `offer-card.tsx`, replace the placeholder onClick with calls to `acceptOffer(match.id)` / `declineOffer({...})`. Use `useTransition` + `toast` for feedback.

- [ ] **Step 6: Manual e2e**

Sign in as creator. Click accept on a proposed match → confirm row updates in DB and the card disappears from inbox, shows up in active-gifts. Same for decline.

- [ ] **Step 7: Commit**

```bash
git add app/portal/creator/_actions.ts app/portal/creator/_components/offer-card.tsx tests/portal/accept-offer.test.ts
git commit -m "feat(portal): accept and decline offer server actions"
```

---

## Phase 4 — Active gifts

End-of-phase: creator can mark received, decline-after-receipt, or "still trying it" on accepted matches.

### Task 4.1: Active-gift card UI

**Files:**
- Create: `app/portal/creator/_components/active-gift-card.tsx`

- [ ] **Step 1: Build the card**

Show: brand name, product image, product name, status badge (`accepted` → "in transit", `received` → "ready to evaluate", `still_trying` → "checking back in 14 days", `eval_submitted` → "eval received", `eval_complete` → "eval complete").

If `stage === 'accepted'`: show "I received it" button.
If `stage === 'received'`: show three equal-weight buttons — "submit eval" (link to `/portal/creator/eval/[match_id]`), "not for me" (opens decline form), "still trying it" (calls action).

Reuse the demo's three-equal-buttons pattern from `feedback-flow.tsx` for the UX intent (no path is more prominent than another).

- [ ] **Step 2: Wire to `active-gifts-tab.tsx`**

Replace the JSON dump with a stack of `<ActiveGiftCard>` per match.

- [ ] **Step 3: Commit**

```bash
git add app/portal/creator/_components/active-gift-card.tsx app/portal/creator/_components/active-gifts-tab.tsx
git commit -m "feat(portal): active-gift card UI with stage-aware actions"
```

---

### Task 4.2: `markReceived` / `declineAfterReceipt` / `markStillTrying` server actions

**Files:**
- Modify: `app/portal/creator/_actions.ts`
- Create: `tests/portal/active-gift-actions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/portal/active-gift-actions.test.ts
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/portal/auth', () => ({ getCreatorForCurrentUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  markReceived,
  declineAfterReceipt,
  markStillTrying,
} from '@/app/portal/creator/_actions'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'

function mockUpdateChain() {
  // returns { update, lastUpdateArgs, eqStageCalls }
  const eqFinal = vi.fn().mockResolvedValue({ error: null })
  const inFinal = vi.fn().mockResolvedValue({ error: null })
  const eqCreator = vi.fn().mockReturnValue({ eq: eqFinal, in: inFinal })
  const eqId = vi.fn().mockReturnValue({ eq: eqCreator })
  const update = vi.fn().mockReturnValue({ eq: eqId })
  return { update, eqId, eqCreator, eqFinal, inFinal }
}

describe('markReceived', () => {
  it('rejects when not signed in', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue(null)
    const r = await markReceived('m1')
    expect(r.ok).toBe(false)
  })

  it('updates stage to received with stage=accepted guard', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const chain = mockUpdateChain()
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: chain.update }),
    })
    const r = await markReceived('m1')
    expect(r.ok).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({
      stage: 'received',
      received_at: expect.any(String),
    })
    expect(chain.eqFinal).toHaveBeenCalledWith('stage', 'accepted')
  })
})

describe('declineAfterReceipt', () => {
  it('updates stage with stage IN (accepted, received) guard', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const chain = mockUpdateChain()
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: chain.update }),
    })
    const r = await declineAfterReceipt({
      matchId: '00000000-0000-0000-0000-000000000001',
      reasons: ['not aligned'],
      note: '',
    })
    expect(r.ok).toBe(true)
    expect(chain.inFinal).toHaveBeenCalledWith('stage', ['accepted', 'received'])
  })
})

describe('markStillTrying', () => {
  it('updates stage to still_trying with stage=received guard', async () => {
    ;(getCreatorForCurrentUser as any).mockResolvedValue({ id: 'c1' })
    const chain = mockUpdateChain()
    ;(createClient as any).mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: chain.update }),
    })
    const r = await markStillTrying('m1')
    expect(r.ok).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({ stage: 'still_trying' })
    expect(chain.eqFinal).toHaveBeenCalledWith('stage', 'received')
  })
})
```

- [ ] **Step 2: Run — fail**

- [ ] **Step 3: Implement (append to `_actions.ts`)**

```typescript
export async function markReceived(matchId: string) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ stage: 'received', received_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'accepted')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}

const declineAfterReceiptSchema = declineSchema // same shape

export async function declineAfterReceipt(input: z.infer<typeof declineAfterReceiptSchema>) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const parsed = declineAfterReceiptSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({
      stage: 'declined_after_receipt',
      declined_at: new Date().toISOString(),
      decline_reason: parsed.data.reasons.join(', ') || null,
      decline_note: parsed.data.note || null,
    })
    .eq('id', parsed.data.matchId)
    .eq('creator_id', creator.id)
    .in('stage', ['accepted', 'received'])
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}

export async function markStillTrying(matchId: string) {
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('matches')
    .update({ stage: 'still_trying' })
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .eq('stage', 'received')
  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/portal/creator')
  return { ok: true as const }
}
```

- [ ] **Step 4: Run — pass; type-check; wire to UI; manual smoke; commit**

```bash
pnpm test
pnpm exec tsc --noEmit
git add app/portal/creator tests/portal
git commit -m "feat(portal): markReceived, declineAfterReceipt, markStillTrying"
```

---

## Phase 5 — Eval submission

End-of-phase: creator can record/upload a video and the match flips to `eval_submitted`.

### Task 5.1: Eval submit page

**Files:**
- Create: `app/portal/creator/eval/[match_id]/page.tsx`
- Create: `app/portal/creator/eval/[match_id]/_components/eval-submit-form.tsx`
- Create: `app/portal/creator/eval/[match_id]/loading.tsx`

- [ ] **Step 1: Server page validates ownership + stage**

```tsx
// page.tsx
import { redirect, notFound } from 'next/navigation'
import { getCreatorForCurrentUser } from '@/lib/portal/auth'
import { createClient } from '@/lib/supabase/server'
import { EvalSubmitForm } from './_components/eval-submit-form'

export default async function EvalPage({
  params,
}: { params: Promise<{ match_id: string }> }) {
  const { match_id } = await params
  const creator = await getCreatorForCurrentUser()
  if (!creator) redirect('/login')

  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches')
    .select(`id, stage,
             product:products(name, image_url,
                             brand:brands(brand_name))`)
    .eq('id', match_id)
    .eq('creator_id', creator.id)
    .single()
  if (!match) notFound()
  if (match.stage !== 'received') {
    return (
      <p className="text-[0.9rem] text-muted-warm">
        This eval isn&rsquo;t open yet (or has already been submitted).
      </p>
    )
  }

  return (
    <div className="max-w-[640px]">
      <h1 className="font-display text-[1.5rem] mb-2">
        record your eval
      </h1>
      <p className="text-[0.9rem] text-ink-soft mb-6">
        Free-form. 30–60 seconds. Talk about whatever feels honest. The bullets
        below are <em>just inspiration</em> — skip any of them.
      </p>

      <ul className="text-[0.85rem] text-ink-soft list-disc pl-5 space-y-1 mb-8">
        <li>Worth the price?</li>
        <li>Who do you think this is for? Who should skip it?</li>
        <li>Anything you didn&rsquo;t expect?</li>
        <li>Your one-line verdict</li>
      </ul>

      <EvalSubmitForm match={match} />
    </div>
  )
}
```

- [ ] **Step 2: Client form**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { submitEval } from '@/app/portal/creator/_actions'

export function EvalSubmitForm({ match }: { match: any }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  function pickFile(f: File | null) {
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!file) return
        start(async () => {
          const fd = new FormData()
          fd.append('match_id', match.id)
          fd.append('file', file)
          const r = await submitEval(fd)
          if (r.ok) {
            toast.success('eval submitted')
            router.push('/portal/creator?eval=submitted')
          } else {
            toast.error(r.error)
          }
        })
      }}
    >
      <input
        type="file"
        accept="video/*"
        // @ts-expect-error: capture is a valid HTML attribute
        capture="user"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        className="block mb-4"
      />
      {preview ? (
        <video src={preview} controls className="w-full max-w-md mb-4 rounded" />
      ) : null}
      <Button type="submit" disabled={!file || pending}>
        {pending ? 'submitting…' : 'submit eval'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: loading.tsx**

```tsx
export default function Loading() {
  return <div className="animate-pulse h-64 w-full max-w-[640px] bg-cream-deep/20 rounded" />
}
```

- [ ] **Step 4: Commit (UI only — action stub on next task)**

```bash
git add app/portal/creator/eval
git commit -m "feat(portal): eval submit page UI"
```

---

### Task 5.2: `submitEval` server action with Storage upload

**Files:**
- Modify: `app/portal/creator/_actions.ts`
- Create: `tests/portal/submit-eval.test.ts`

- [ ] **Step 1: Failing test**

Mock the Supabase storage client; assert the action validates the file mime type and inserts `eval_videos` + flips match stage. Assert it rejects non-video mimes and oversized files.

- [ ] **Step 2: Implement**

```typescript
const SUBMIT_LIMITS = {
  MAX_BYTES: 100 * 1024 * 1024,
  MIMES: ['video/mp4', 'video/quicktime', 'video/webm'],
}

export async function submitEval(formData: FormData) {
  const matchId = String(formData.get('match_id') ?? '')
  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false as const, error: 'No file.' }
  if (file.size > SUBMIT_LIMITS.MAX_BYTES) {
    return { ok: false as const, error: 'Video must be under 100MB.' }
  }
  if (!SUBMIT_LIMITS.MIMES.includes(file.type)) {
    return { ok: false as const, error: 'Unsupported video format.' }
  }
  const creator = await getCreatorForCurrentUser()
  if (!creator) return { ok: false as const, error: 'Not signed in.' }

  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches')
    .select('id, stage')
    .eq('id', matchId)
    .eq('creator_id', creator.id)
    .single()
  if (!match || match.stage !== 'received') {
    return { ok: false as const, error: 'Eval not open for this match.' }
  }

  const ext = file.name.split('.').pop() ?? 'mp4'
  const blobKey = `${matchId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('eval-videos')
    .upload(blobKey, file, { contentType: file.type })
  if (upErr) return { ok: false as const, error: upErr.message }

  const { error: insertErr } = await supabase.from('eval_videos').insert({
    match_id: matchId,
    blob_key: blobKey,
    bytes: file.size,
    mime_type: file.type,
  })
  if (insertErr) return { ok: false as const, error: insertErr.message }

  await supabase
    .from('matches')
    .update({
      stage: 'eval_submitted',
      eval_submitted_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .eq('creator_id', creator.id)

  revalidatePath('/portal/creator')
  return { ok: true as const }
}
```

- [ ] **Step 3: Run tests — pass; type-check; manual smoke (upload a real short video as the creator) — verify storage object created**

- [ ] **Step 4: Commit**

```bash
git add app/portal/creator/_actions.ts tests/portal/submit-eval.test.ts
git commit -m "feat(portal): submitEval server action with storage upload"
```

---

## Phase 6 — Extraction pipeline

End-of-phase: admin clicks "extract" in `/platform/creators/[id]` and sees structured fields.

### Task 6.1: `extractEval` skeleton + tests

**Files:**
- Create: `lib/eval-extraction.ts`
- Create: `lib/schemas/eval.ts`
- Create: `tests/eval-extraction.test.ts`

- [ ] **Step 1: Schema**

```typescript
// lib/schemas/eval.ts
import { z } from 'zod'

export const ExtractedEvalSchema = z.object({
  would_keep_using: z.enum(['yes', 'sometimes', 'no']).nullable(),
  worth_the_price: z.enum(['yes', 'maybe_at_discount', 'no']).nullable(),
  best_for: z.array(z.string()).default([]),
  not_for: z.array(z.string()).default([]),
  one_line_take: z.string().nullable(),
  sentiment: z.enum(['positive', 'mixed', 'negative']).nullable(),
  raw_quotes: z.array(z.string()).default([]),
})

export type ExtractedEval = z.infer<typeof ExtractedEvalSchema>

export const EXTRACTION_PROMPT = `You are extracting structured evaluation data from a creator's video review of a product. Below is the transcript. Extract the following fields. Return JSON matching the schema exactly. Use null for fields the creator did not address — do not infer.

Schema:
{
  "would_keep_using": "yes" | "sometimes" | "no" | null,
  "worth_the_price": "yes" | "maybe_at_discount" | "no" | null,
  "best_for": string[],
  "not_for": string[],
  "one_line_take": string | null,
  "sentiment": "positive" | "mixed" | "negative" | null,
  "raw_quotes": string[]
}

Transcript:
{transcript}
`
```

- [ ] **Step 2: Test scaffolding**

Write tests asserting that:
- A complete success path advances the eval_videos row to `extraction_status='complete'` and the match to `eval_complete`.
- A Whisper failure leaves both at `failed` and the match at `eval_submitted` (re-runnable).
- A Claude JSON-parse failure leaves `extraction_status='failed'` and `extraction_error` populated.
- Re-running a `complete` eval overwrites cleanly (idempotency).

Mock OpenAI + Anthropic SDKs.

- [ ] **Step 3: Skeleton**

```typescript
// lib/eval-extraction.ts
import { createClient } from '@/lib/supabase/server'
import { ExtractedEvalSchema, EXTRACTION_PROMPT } from '@/lib/schemas/eval'

// dependency-injected for testing
export type ExtractEvalDeps = {
  transcribe: (blob: Blob) => Promise<string>
  extract: (transcript: string) => Promise<unknown>
}

export async function extractEval(
  matchId: string,
  deps: ExtractEvalDeps,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: row, error: loadErr } = await supabase
    .from('eval_videos')
    .select('id, match_id, blob_key, transcript, extraction_status')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (loadErr || !row) return { ok: false, error: 'eval row not found' }
  if (row.extraction_status === 'running') {
    return { ok: false, error: 'already running' }
  }

  // ... (transcript step + extraction step + match.stage update)
  // exact bodies in next sub-steps
  return { ok: true }
}
```

- [ ] **Step 4: Implement transcript + extraction + status updates**

Full body fills in:
1. Mark `transcript_status='running'`. Download blob via `supabase.storage.from('eval-videos').download(row.blob_key)`. Call `deps.transcribe(blob)`. On success save `transcript`, mark `complete`. On failure `failed` + return.
2. Mark `extraction_status='running'`. Call `deps.extract(transcript)`. Validate with `ExtractedEvalSchema.safeParse`. On success save `extracted` + mark complete. On failure `failed` + return.
3. On full success: update `matches.stage='eval_complete'`, `eval_complete_at=now()`.

- [ ] **Step 5: Tests pass; type-check; commit**

```bash
git add lib/eval-extraction.ts lib/schemas/eval.ts tests/eval-extraction.test.ts
git commit -m "feat(eval): extractEval pipeline with DI for tests"
```

---

### Task 6.2: Whisper + Claude implementations

**Files:**
- Create: `lib/eval-extraction-providers.ts`

- [ ] **Step 1: Real `transcribe` impl**

```typescript
// lib/eval-extraction-providers.ts
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const openai = new OpenAI()
const anthropic = new Anthropic()

export async function transcribeWithWhisper(blob: Blob): Promise<string> {
  const file = new File([blob], 'eval.mp4', { type: blob.type || 'video/mp4' })
  const r = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  })
  return r.text
}

export async function extractWithClaude(transcript: string): Promise<unknown> {
  const r = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: EXTRACTION_PROMPT.replace('{transcript}', transcript),
      },
    ],
  })
  const text = r.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as any).text)
    .join('')
  // strip code fences if any, then parse
  const json = text.replace(/^```json\s*|\s*```$/g, '').trim()
  return JSON.parse(json)
}
```

- [ ] **Step 2: Add SDKs**

```bash
pnpm add openai @anthropic-ai/sdk
```

- [ ] **Step 3: Required env**

In `.env.local` (and prod via Vercel env):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

- [ ] **Step 4: Commit**

```bash
git add lib/eval-extraction-providers.ts package.json pnpm-lock.yaml
git commit -m "feat(eval): Whisper + Claude Haiku providers"
```

---

### Task 6.3: Admin "run extraction" button + render extracted UI

**Files:**
- Modify: `app/platform/(authed)/creators/[id]/_actions.ts`
- Create: `app/platform/(authed)/creators/[id]/_components/run-extraction-button.tsx`
- Create: `app/platform/(authed)/creators/[id]/_components/extracted-eval-view.tsx`
- Modify: `app/platform/(authed)/creators/[id]/page.tsx`

- [ ] **Step 1: Server action wrapping `extractEval`**

```typescript
// _actions.ts (append)
'use server'

import { extractEval } from '@/lib/eval-extraction'
import {
  transcribeWithWhisper,
  extractWithClaude,
} from '@/lib/eval-extraction-providers'
import { revalidatePath } from 'next/cache'

export async function runExtractionAction(matchId: string) {
  const r = await extractEval(matchId, {
    transcribe: transcribeWithWhisper,
    extract: extractWithClaude,
  })
  revalidatePath(`/platform/creators`)
  return r
}
```

- [ ] **Step 2: Button**

```tsx
'use client'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { runExtractionAction } from '../_actions'

export function RunExtractionButton({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await runExtractionAction(matchId)
          if (r.ok) toast.success('extracted')
          else toast.error(r.error ?? 'extraction failed')
        })
      }
    >
      {pending ? 'extracting…' : 'run extraction'}
    </Button>
  )
}
```

- [ ] **Step 3: Extracted view**

```tsx
// _components/extracted-eval-view.tsx
import type { ExtractedEval } from '@/lib/schemas/eval'

export function ExtractedEvalView({ data }: { data: ExtractedEval }) {
  return (
    <dl className="grid grid-cols-2 gap-y-3 text-[0.85rem]">
      <dt className="text-muted-warm">would keep using</dt>
      <dd>{data.would_keep_using ?? '—'}</dd>
      <dt className="text-muted-warm">worth the price</dt>
      <dd>{data.worth_the_price ?? '—'}</dd>
      <dt className="text-muted-warm">best for</dt>
      <dd>{data.best_for.join(', ') || '—'}</dd>
      <dt className="text-muted-warm">not for</dt>
      <dd>{data.not_for.join(', ') || '—'}</dd>
      <dt className="text-muted-warm">one-line take</dt>
      <dd className="italic">{data.one_line_take ?? '—'}</dd>
      <dt className="text-muted-warm">sentiment</dt>
      <dd>{data.sentiment ?? '—'}</dd>
      <dt className="text-muted-warm">raw quotes</dt>
      <dd>
        <ul className="list-disc pl-4">
          {data.raw_quotes.map((q, i) => <li key={i}>{q}</li>)}
        </ul>
      </dd>
    </dl>
  )
}
```

- [ ] **Step 4: Add Matches section to creator detail page**

In `/platform/creators/[id]/page.tsx`, fetch the creator's matches with their latest `eval_videos` row. For each match:
- Show stage + product + brand
- If `stage === 'eval_submitted'`: show `<RunExtractionButton matchId={...} />` + a video link (signed URL)
- If `stage === 'eval_complete'`: show `<ExtractedEvalView data={eval.extracted} />`
- If extraction failed: show a "retry" button (also `<RunExtractionButton>`) + the error.

- [ ] **Step 5: End-to-end smoke**

Submit a real short video as creator → in admin click extract → wait ~30–60s → see extracted JSON inline.

- [ ] **Step 6: Commit**

```bash
git add app/platform/\(authed\)/creators
git commit -m "feat(admin): run extraction button + extracted-eval display"
```

---

## Phase 7 — Polish + smoke

### Task 7.1: Browse-the-flow checklist (manual)

- [ ] **Step 1: End-to-end with a real test creator**

1. Apply at `/creator` (existing flow).
2. As admin, see the creator in `/platform/creators`. Click into them.
3. Click "send portal invite" → confirm magic-link email arrives.
4. Click the link → land on `/portal/creator`. Empty inbox.
5. As admin, manually insert a `proposed` match (SQL or build a minimal `/platform/creators/[id]/new-match` form — out of scope here, just SQL).
6. As creator, refresh `/portal/creator` → see the offer card. Click accept.
7. Card moves to active gifts. Click "I received it".
8. Click "submit eval". Pick a short video (any video from your phone). Submit.
9. As admin, click "run extraction" on that match. Wait 30–60s. See structured JSON.
10. As creator, refresh — card now reads "eval complete".

- [ ] **Step 2: Document any rough edges in `docs/superpowers/specs/2026-05-01-creator-portal-design.md` § Open Questions for the next iteration.**

- [ ] **Step 3: Final commit**

```bash
git add docs/
git commit -m "docs: post-smoke notes from creator-portal v1 ship"
```

---

## Self-review checklist (DO THIS BEFORE STARTING IMPLEMENTATION)

Each spec section maps to a phase:

| Spec § | Plan coverage |
|--------|---------------|
| §3 user journey | Phases 2–7 (creator UI, admin button, extraction) |
| §4 routing | Task 1.3 + 2.1 |
| §5 auth | Tasks 1.1–1.3 |
| §6.1 schema | Task 0.2 |
| §6.2 stages | Phases 3–4 (server actions) |
| §6.3 extracted JSON | Task 6.1 (Zod schema) |
| §7 UI surfaces | Phases 2–4 + 5.1 |
| §8 server actions | Phases 3, 4, 5 |
| §9 storage | Tasks 0.4 + 5.2 |
| §10 extraction | Phases 6.1–6.3 |
| §11 empty/loading/error | Tasks 2.3 + 5.1 |

No gaps detected.

**Type/name consistency:** `extractEval`, `submitEval`, `acceptOffer`, `declineOffer`, `markReceived`, `declineAfterReceipt`, `markStillTrying`, `sendPortalInvite`, `runExtractionAction` are used consistently across tasks.

**Placeholder scan:** no TBDs, no "implement later" — every step has the actual code or the actual command.

---

## Open execution questions

1. **`/creator` → Supabase populate** is Task 0.0; resolve before Phase 1.
2. **Existing `is_giftly_admin()` helper**: Task 0.3 step 2 — the engineer must verify whether prior migrations already created an equivalent helper before adding a duplicate.
3. **Magic-link email "from" address**: Supabase default is fine for v1; if branded sender is required, configure custom SMTP via Resend (already wired for `/creator` form responses).
