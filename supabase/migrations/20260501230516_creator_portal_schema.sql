-- Creator portal: products, matches, eval_videos + creators auth binding.
-- Spec: docs/superpowers/specs/2026-05-01-creator-portal-design.md §6.1
-- Plan: docs/superpowers/plans/2026-05-01-creator-portal.md (Task 0.2)
-- All additive: new tables + new columns on creators. No alterations to
-- existing data or constraints.

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

-- matches: one row per creator+product pair, walks through stages
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

-- one eval video per match (replaceable; latest by created_at wins)
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

-- bind creators to auth users (nullable until admin invite is sent)
alter table creators add column auth_user_id uuid references auth.users(id);
alter table creators add column invited_at timestamptz;
create unique index creators_auth_user_id_idx
  on creators(auth_user_id) where auth_user_id is not null;
