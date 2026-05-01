# Creator Portal — Design

**Date:** 2026-05-01
**Status:** Approved (informal)
**Owner:** Ethan
**Related:** `/demo/creator` (visual reference), `/platform/creators/*` (admin tooling)

---

## 1. Summary

Build the customer-facing creator portal at `/portal/creator/*`. It mirrors the flow shown in `/demo/creator` (Inbox + Active gifts tabs) but with real Supabase auth, real data, real mutations, and a video-eval submission flow that replaces the demo's love/pass/still-trying gate.

The brand-side portal stays manual for now — admins handle products, matches, and shipping in `/platform/*`.

---

## 2. Goals & Non-goals

### Goals

- A real creator can be invited from `/platform/creators/[id]`, click an emailed magic link, land in `/portal/creator`, and use it.
- Creator can: see offers in their inbox, accept or decline an offer, mark a received product, and submit a free-form video eval.
- Admin can trigger LLM extraction (Whisper transcript → Claude Haiku structured fields) on a submitted video and see the structured result in `/platform/creators/[id]`.

### Non-goals (deferred to later specs)

- Brand-facing portal (`/portal/brand/*`).
- Auto-extraction on submit. The `extractEval(match_id)` function is built so this is a one-line upgrade, but v1 only triggers it from the admin button.
- In-browser video recording (MediaRecorder API). v1 uses native `<input type="file" accept="video/*" capture="user">`.
- Push/email notifications when a new offer arrives. v1 surfaces offers only on portal load.
- Explicit "shipped" or "delivered" stages — admin handles shipping in spreadsheets / Shopify / wherever. The full stage set the portal *does* track is in §6.2; the principle is "no stage advances unless a creator action triggers it."
- Brand portal RLS policies and brand-side auth.
- Post URL submission, payouts, commissions display. The demo's "love → submit post URL" flow is replaced by the video eval; commissions are admin-tracked for v1.

---

## 3. User journey

### Creator

1. Submits the public `/creator` application form (existing). Webhook writes to Sheets *and* `creators` table (assumed; see Open Questions).
2. Admin reviews them in `/platform/creators/[id]`, clicks **send portal invite**.
3. Creator receives Supabase magic-link email.
4. Click → lands at `/portal/creator`. First view: header (`hey {first_name}`) + sidebar + tabs (Inbox / Active gifts).
5. **Inbox**: list of offers (matches with `stage = 'proposed'`). Each offer shows brand, product, image, commission %, why-matched. Two actions: **Accept** or **Decline (with reason)**.
6. **Active gifts**: matches the creator has accepted (`stage IN ('accepted', 'received', 'eval_submitted', 'eval_complete')`). Each card shows brand + product + status. Once they have the product in hand, they tap **I received it** → status flips to `received`.
7. Once received, the card surfaces three equal-weight actions (matching demo's UX intent):
   - **Submit eval** → routes to `/portal/creator/eval/[match_id]`.
   - **Not for me** → opens decline-form (reasons + optional note); status → `declined_after_receipt`. (This is a stage value not in the original list — see §6.2.)
   - **Still trying it** → status → `still_trying`, dismissable banner says "we'll check back in 14 days."
8. Eval page: shows product reminder + on-screen talking-point examples (free-form, not enforced) + native file input. Creator picks/records a video, taps submit.
9. Server action uploads to Supabase Storage, inserts `eval_videos` row, sets match `stage = 'eval_submitted'`. Creator sees confirmation page; the active-gift card now reads "eval received."

### Admin

1. In `/platform/creators/[id]`, sees a **send portal invite** button (when creator has no `auth_user_id` yet).
2. After a creator submits an eval, admin sees an **eval submitted, extract now** button on the match row in `/platform/creators/[id]` or a new `/platform/evals` queue page.
3. Click → calls `extractEval(match_id)` server action. Page polls or shows a loading state for ~30–60s; on completion the structured fields render inline.
4. Admin can re-trigger extraction (idempotent) if the result looks wrong.

---

## 4. Routing

```
/portal/creator                 → Inbox + Active gifts (tabbed)
/portal/creator/eval/[match_id] → Eval submission page
/portal/creator/settings        → (stub for v1; profile edit deferred)
```

Middleware:

- Existing middleware redirects `/platform/*` for non-`@trygiftly.com`.
- Add: `/portal/creator/*` requires a Supabase session AND a row in `creators` with `auth_user_id = session.user.id`. Otherwise redirect to `/login?next=/portal/creator`.
- A creator who is *not* yet bound to an auth user (i.e., admin hasn't sent an invite) cannot reach the portal even with a magic link from another flow. The invite is the binding event.

`/portal/brand/*` is reserved (route-level 404 for v1) so the namespace is preassigned.

---

## 5. Auth model

### Identity

- Supabase Auth (already in use).
- `creators.auth_user_id uuid REFERENCES auth.users(id)` — added column, nullable until the invite is accepted.
- A creator's `email` (from the application form) is the canonical identity. The invite uses that email.

### Invite flow

Server action `sendPortalInvite(creator_id)` (admin-only, in `/platform/creators/[id]/_actions.ts`):

1. Loads creator. If `auth_user_id IS NOT NULL`, abort (already invited).
2. Calls `supabase.auth.admin.inviteUserByEmail(creator.email, { redirectTo: '/portal/creator' })`.
3. Updates `creators.auth_user_id` to the returned `auth.users.id`. Sets `creators.invited_at = now()`.
4. Returns ok. Admin sees a success toast.

If the creator's email is already an auth user (e.g., they previously applied as a brand contact), the invite still binds the existing auth user to this creators row.

### RLS

- `creators` table: read own row when `auth.uid() = creators.auth_user_id`. Admins (existing `@trygiftly.com` policy) read all.
- `matches` table: read rows where `creator_id IN (SELECT id FROM creators WHERE auth_user_id = auth.uid())`. Admins read all.
- `eval_videos` table: read rows whose `match_id` belongs to creator-owned matches. Admins read all.
- `products` table: read all rows that have any match with this creator. (Or just read-all-products; it's not sensitive.)
- Storage bucket `eval-videos`: per-object RLS keyed to `match_id` membership.

### Invariant

A creator only ever sees their own data; admin sees everything. Brand-side identity is out of scope.

---

## 6. Data model

### 6.1 New tables

```sql
-- products owned by brands
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  image_url text,
  retail_price_cents integer,
  sku text,
  status text not null default 'active', -- 'active' | 'paused' | 'archived'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_brand_id_idx on products(brand_id);

-- matches: a single row that walks through stages
create table matches (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  stage text not null default 'proposed', -- see §6.2
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
  created_by uuid references auth.users(id), -- admin who created the match
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, product_id) -- one match per creator+product pair
);
create index matches_creator_id_stage_idx on matches(creator_id, stage);
create index matches_product_id_idx on matches(product_id);

-- eval videos (one per match; replaceable)
create table eval_videos (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  blob_key text not null,            -- Supabase Storage object key
  blob_url text,                     -- signed URL (regenerated on access)
  duration_sec integer,
  bytes integer,
  mime_type text,
  transcript text,
  transcript_status text not null default 'pending',  -- 'pending' | 'running' | 'complete' | 'failed'
  transcript_error text,
  extracted jsonb,
  extraction_status text not null default 'pending',  -- 'pending' | 'running' | 'complete' | 'failed'
  extraction_error text,
  extracted_at timestamptz,
  created_at timestamptz not null default now()
);
create index eval_videos_match_id_idx on eval_videos(match_id);

-- additive change to existing creators table
alter table creators add column auth_user_id uuid references auth.users(id);
alter table creators add column invited_at timestamptz;
create unique index creators_auth_user_id_idx on creators(auth_user_id) where auth_user_id is not null;
```

### 6.2 `matches.stage` state machine

```
proposed
  ├─ → accepted              (creator clicks Accept)
  └─ → declined              (creator clicks Decline; decline_reason set)

accepted
  ├─ → received              (creator clicks I received it)
  └─ → declined_after_receipt (creator clicks Not for me on active-gift card)

received
  ├─ → eval_submitted        (creator submits video)
  ├─ → declined_after_receipt
  └─ → still_trying          (creator picks Still trying it)

eval_submitted
  └─ → eval_complete         (admin runs extractEval and it succeeds)

still_trying ← reverts to received when creator returns and picks a different action
```

`extraction_status` on `eval_videos` is independent; an `eval_videos` row can have `transcript_status='complete'` and `extraction_status='failed'`, and the parent match remains at `eval_submitted` until admin re-runs and succeeds.

### 6.3 `eval_videos.extracted` JSON shape (v1)

The LLM extracts into this shape (all fields optional — leave null when not mentioned):

```jsonc
{
  "would_keep_using": null,        // 'yes' | 'sometimes' | 'no' | null
  "worth_the_price": null,         // 'yes' | 'maybe_at_discount' | 'no' | null
  "best_for": [],                  // array of free-text demographic descriptors
  "not_for": [],                   // array of free-text demographic descriptors
  "one_line_take": null,           // string
  "sentiment": null,               // 'positive' | 'mixed' | 'negative'
  "raw_quotes": []                 // notable verbatim quotes from transcript
}
```

This is admin-tunable. The schema above is the v1 target; if early evals show the LLM struggles with categorical answers ("yes" vs "sometimes"), we widen them to free-text in v2 and let agents do the inference.

---

## 7. UI surfaces

Faithful ports of `/demo/creator` components, swapped to read from Supabase instead of mock data. New empty/loading/error states added (the demo doesn't ship those).

### `/portal/creator` (page.tsx)

- Server Component. Loads from session: creator + matches grouped by stage.
- Reuses (with light edits): `creator-portal/sidebar`, `creator-portal/inbox-tab`, `creator-portal/active-gifts-tab`, `creator-portal/offer-card`, `creator-portal/no-obligation-banner`.
- Tabs default to `inbox` if any `proposed` matches exist; else `gifts`.
- Empty states:
  - Inbox empty: "No new offers — we'll email you when one comes in." (We don't actually email yet, but that copy points to v2.)
  - Active gifts empty: "Once you accept an offer it'll show up here."
- Loading: standard Next App Router `loading.tsx` with skeleton.
- Error: `error.tsx` boundary; offers a reload + a sign-out fallback.

### `/portal/creator/eval/[match_id]`

- Server Component validates match ownership via RLS. 404 if no row visible.
- Client island: `<EvalSubmitForm />`:
  - Product reminder card (image, name, brand)
  - "Talking points to riff on" section — bulleted hints, *not* a checklist:
    - Worth the price?
    - Who do you think this is for?
    - Anything you didn't expect?
    - Your one-line verdict
  - `<input type="file" accept="video/*" capture="user">` (camera by default on mobile, gallery as alternative)
  - File preview (using `URL.createObjectURL` on the selected `File`)
  - Submit button. Disabled until a file is selected.
- On submit:
  - `<form action={submitEval}>` (Server Action)
  - Inside the action: get signed upload URL → POST file → insert `eval_videos` → flip match `stage` → `redirect('/portal/creator?eval=submitted')`
  - The action does NOT trigger extraction. Admin does that later.

### `/platform/creators/[id]` (additive changes)

- New section: **Matches**. Lists matches for this creator with stage badges.
- For matches at `stage = 'eval_submitted'`: shows **Run extraction** button.
- After extraction completes: shows the structured fields inline + a link to the video.

---

## 8. Server actions

### Creator-facing (`app/portal/creator/_actions.ts`)

- `acceptOffer(match_id)` — verifies ownership, sets `stage = 'accepted'`, `accepted_at = now()`.
- `declineOffer(match_id, reason, note?)` — sets `stage = 'declined'`, `decline_reason`, `decline_note`, `declined_at`.
- `markReceived(match_id)` — `stage = 'received'`, `received_at = now()`.
- `declineAfterReceipt(match_id, reason, note?)` — `stage = 'declined_after_receipt'`.
- `markStillTrying(match_id)` — `stage = 'still_trying'`.
- `submitEval(match_id, file)` — uploads video, inserts `eval_videos`, sets `stage = 'eval_submitted'`.

All re-validate with Zod. All check ownership against `creators.auth_user_id = auth.uid()` even though RLS does too — defense in depth.

### Admin-facing (`app/platform/(authed)/creators/[id]/_actions.ts`, additive)

- `sendPortalInvite(creator_id)` — see §5.
- `extractEval(match_id)` — see §10.

---

## 9. Storage

- Supabase Storage bucket `eval-videos`, private (no public reads).
- Object key pattern (within the bucket): `{match_id}/{uuid}.{ext}`.
- RLS: object accessible if the requesting user's `auth.uid()` owns a creator with a match matching the prefix `match_id`. Admins read all.
- `submitEval` flow: server action issues a signed upload URL via `supabase.storage.from('eval-videos').createSignedUploadUrl()`, returns to client, client `fetch(url, { method: 'PUT', body: file })`, then a follow-up server action inserts the `eval_videos` row.
- Max size: 100MB (covers ~90s 1080p H.264). Reject larger uploads server-side.
- Mime-type allowlist: `video/mp4`, `video/quicktime`, `video/webm`. Reject others.

---

## 10. Extraction pipeline (admin-triggered)

`extractEval(match_id)` lives in `lib/eval-extraction.ts` so it's callable from anywhere:

```typescript
export async function extractEval(match_id: string): Promise<void> {
  // 1. Load eval_videos row for this match. If extraction_status='running', abort.
  // 2. Mark transcript_status='running'; download blob; call Whisper; save transcript.
  // 3. If transcript fails, mark transcript_status='failed' and exit.
  // 4. Mark extraction_status='running'; call Claude Haiku with EXTRACTION_PROMPT
  //    + transcript; parse JSON; validate against schema (Zod); save extracted.
  // 5. Mark match.stage='eval_complete' on success; eval_complete_at=now().
  // 6. On any failure: set the relevant *_status to 'failed', save error, leave
  //    match at eval_submitted so admin can retry.
}
```

- v1 callers: admin button. v2 caller: `submitEval` wraps in `ctx.waitUntil(extractEval(...))`.
- Whisper API: OpenAI's `whisper-1` (already used in many Next.js stacks; reasonable accuracy at ~$0.006/min). Alternative `gemini-2.0-flash-audio` if we already have Gemini keys.
- Claude Haiku: `claude-haiku-4-5-20251001` via Anthropic SDK (we already have an API key per `outreach-agents/find-emails.py`).
- Idempotency: re-running on a row that's `extraction_status='complete'` overwrites the previous `extracted` JSON. Admin can re-tune the prompt and re-run cleanly.

### Extraction prompt (v1)

```
You are extracting structured evaluation data from a creator's video review of
a product. Below is the transcript. Extract the following fields. Return JSON
matching the schema exactly. Use null for fields the creator did not address —
do not infer.

Schema:
{
  "would_keep_using": "yes" | "sometimes" | "no" | null,
  "worth_the_price": "yes" | "maybe_at_discount" | "no" | null,
  "best_for": string[],         // demographic descriptors mentioned as good fit
  "not_for": string[],          // demographic descriptors mentioned as poor fit
  "one_line_take": string | null,  // <= 200 chars; verbatim or very close
  "sentiment": "positive" | "mixed" | "negative",
  "raw_quotes": string[]        // up to 5 verbatim quotes worth surfacing
}

Transcript:
{transcript}
```

Tunable in `lib/eval-extraction.ts`. The first ~50 evals will be the prompt-tuning corpus.

---

## 11. Empty / loading / error states

- All portal pages have a `loading.tsx` skeleton matching the demo's card layout.
- All have an `error.tsx` boundary with a reload button and a sign-out link (covers the "stale session" case).
- The eval submit page has a client-side upload-progress state (XHR upload, percentage), since uploads can take 30s+ on a phone connection. On failure: keep file selected, show retry button, do not lose state.
- Magic-link email failure: surfaced in the admin toast with a retry button. Don't silently drop.

---

## 12. Out of scope for v1

- Brand portal.
- Auto-extraction (`waitUntil` wrap of `submitEval`).
- In-browser MediaRecorder.
- Notifications email when a new offer drops.
- Post URL submission, payouts, commissions display.
- Creator profile edit (`/portal/creator/settings` is a stub).
- Bulk actions in admin (extract many at once).
- Re-record / multi-take inside the eval page (creator can pick a different file before submit, but post-submit there's no "replace video" — they'd need admin help).

---

## 13. Open questions

1. **`/creator` form → `creators` table**: does the existing webhook write to Supabase `creators`, or only Sheets? If only Sheets, we need to add a Supabase write so the invite flow has a row to bind to. (Looking at `/platform/(authed)/creators/page.tsx` it reads from Supabase, so something is populating `creators` — confirm.)
2. **Whisper provider lock-in**: OpenAI vs Gemini-audio vs (newer) Anthropic-with-audio. Decide before implementation.
3. **Email "from" address for the invite**: Supabase default vs custom SMTP wired through Resend (already configured for `/creator` form responses). Match the existing Resend setup for consistency.
4. **Invite token TTL**: Supabase default is 24h. Long enough for v1?

These don't block the implementation plan; the implementation will pick reasonable defaults and flag them in the PR.

---

## 14. Future work (next specs, not this one)

- `2026-MM-DD-creator-portal-auto-extraction-design.md`: wrap `submitEval` in `waitUntil`; remove admin trigger as primary.
- `2026-MM-DD-brand-portal-design.md`: `/portal/brand/*`, brand-auth flow, brand-side products + matches view.
- `2026-MM-DD-eval-data-api-design.md`: external API endpoint for shopping agents to query extracted eval data.
- `2026-MM-DD-creator-notifications-design.md`: email on new offer, on shipped, on extraction complete.
