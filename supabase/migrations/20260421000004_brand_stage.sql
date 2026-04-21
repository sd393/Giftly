-- Per-brand conversation stage. Default `cold`; promoted to `in_talks` when
-- a reply comes in (or manually). `done` ends the thread without an
-- explicit won/lost split.

create type public.brand_stage as enum ('cold', 'in_talks', 'done');

alter table public.brands
  add column stage public.brand_stage not null default 'cold';

create index idx_brands_stage on public.brands (stage)
  where archived_at is null;
