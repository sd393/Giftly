-- Creators, brands, and activities tables for inbound applications.
-- Row-level security is enabled with no anon/authenticated policies; the
-- server-side secret key bypasses RLS to perform inserts.

create schema if not exists extensions;
create extension if not exists citext with schema extensions;

create type public.entity_type as enum ('creator', 'brand');
create type public.activity_action as enum ('created', 'updated', 'status_changed', 'note_added');
create type public.activity_actor as enum ('system', 'user');

create table public.creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email extensions.citext not null unique,
  social_handles text,
  platform text,
  followers text,
  niches text[] not null default '{}',
  product_interests text,
  content_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  contact_role text,
  contact_email extensions.citext not null,
  brand_name text not null,
  website text not null unique,
  category text,
  product_description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid not null,
  action public.activity_action not null,
  actor public.activity_actor not null,
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activities_entity_idx on public.activities (entity_type, entity_id);
create index activities_created_at_idx on public.activities (created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger creators_touch_updated_at
  before update on public.creators
  for each row execute function public.touch_updated_at();

create trigger brands_touch_updated_at
  before update on public.brands
  for each row execute function public.touch_updated_at();

alter table public.creators enable row level security;
alter table public.brands enable row level security;
alter table public.activities enable row level security;

revoke all on public.creators from anon, authenticated;
revoke all on public.brands from anon, authenticated;
revoke all on public.activities from anon, authenticated;
