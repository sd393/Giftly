-- Distinguish where a brand / creator row came from:
--   application — public form submission (trygiftly.com/brands, /creators)
--   outreach    — created by the cold-outreach pipeline upsert
--   manual      — added by a team member via /brands/new or /creators/new
--
-- Pages lean on this:
--   /           (inbound)  → source='application' only
--   /brands                → hides source='outreach' by default
--   /creators              → hides source='outreach' by default
--   /outbound              → everything; source filter available there

create type public.record_source as enum ('application', 'outreach', 'manual');

-- Default matches the current population:
--   • all existing brands were imported from the Throne backfill pipeline
--   • all existing creators came through the public /creators form
alter table public.brands
  add column source public.record_source not null default 'outreach';

alter table public.creators
  add column source public.record_source not null default 'application';

create index idx_brands_source on public.brands (source) where archived_at is null;
create index idx_creators_source on public.creators (source) where archived_at is null;
