-- Internal platform schema:
-- * drop unused activities table + its enums (replaced by outbound_messages + per-table history)
-- * extend creators / brands with reviewed_at, archived_at, owner_id
-- * add api_tokens, outbound_messages, outbound_tasks
-- * team-member RLS policy gated on @trygiftly.com JWT email

drop table if exists public.activities;
drop type if exists public.activity_action;
drop type if exists public.activity_actor;

alter table public.creators
  add column if not exists reviewed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.brands
  add column if not exists reviewed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists idx_creators_reviewed_at on public.creators(reviewed_at);
create index if not exists idx_creators_archived_at on public.creators(archived_at);
create index if not exists idx_creators_owner on public.creators(owner_id);
create index if not exists idx_brands_reviewed_at on public.brands(reviewed_at);
create index if not exists idx_brands_archived_at on public.brands(archived_at);
create index if not exists idx_brands_owner on public.brands(owner_id);

create type public.message_direction as enum ('outbound', 'inbound');
create type public.message_status as enum ('sent', 'delivered', 'replied', 'bounced', 'failed');
create type public.task_status as enum ('todo', 'in_progress', 'waiting', 'done', 'dropped');
create type public.created_by_kind as enum ('user', 'agent');

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null unique,
  scopes text[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index idx_api_tokens_created_by on public.api_tokens(created_by);
create index idx_api_tokens_active on public.api_tokens(revoked_at) where revoked_at is null;

create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid not null,
  channel text not null,
  direction public.message_direction not null default 'outbound',
  subject text,
  body text not null,
  sender_account text,
  status public.message_status not null default 'sent',
  external_id text,
  sent_at timestamptz not null default now(),
  created_by public.created_by_kind not null,
  created_by_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_outbound_messages_entity on public.outbound_messages(entity_type, entity_id, sent_at desc);
create index idx_outbound_messages_sent_at on public.outbound_messages(sent_at desc);
create index idx_outbound_messages_external_id on public.outbound_messages(external_id) where external_id is not null;
create index idx_outbound_messages_status on public.outbound_messages(status);

create table public.outbound_tasks (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type,
  entity_id uuid,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  due_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null,
  created_by public.created_by_kind not null,
  created_by_id uuid not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbound_tasks_entity_consistency
    check ((entity_type is null and entity_id is null) or (entity_type is not null and entity_id is not null))
);

create index idx_outbound_tasks_entity on public.outbound_tasks(entity_type, entity_id);
create index idx_outbound_tasks_status on public.outbound_tasks(status);
create index idx_outbound_tasks_owner on public.outbound_tasks(owner_id);
create index idx_outbound_tasks_due on public.outbound_tasks(due_at) where due_at is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger outbound_tasks_set_updated_at
  before update on public.outbound_tasks
  for each row execute function public.set_updated_at();

create trigger creators_set_updated_at
  before update on public.creators
  for each row execute function public.set_updated_at();

create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') like '%@trygiftly.com'
$$;

alter table public.api_tokens enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.outbound_tasks enable row level security;

create policy "team members full access" on public.api_tokens
  for all using (public.is_team_member()) with check (public.is_team_member());

create policy "team members full access" on public.outbound_messages
  for all using (public.is_team_member()) with check (public.is_team_member());

create policy "team members full access" on public.outbound_tasks
  for all using (public.is_team_member()) with check (public.is_team_member());

drop policy if exists "team members full access" on public.creators;
drop policy if exists "team members full access" on public.brands;

create policy "team members full access" on public.creators
  for all using (public.is_team_member()) with check (public.is_team_member());

create policy "team members full access" on public.brands
  for all using (public.is_team_member()) with check (public.is_team_member());
