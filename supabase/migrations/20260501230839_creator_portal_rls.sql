-- RLS for creator-portal tables.
-- Plan: docs/superpowers/plans/2026-05-01-creator-portal.md (Task 0.3)
-- Spec: docs/superpowers/specs/2026-05-01-creator-portal-design.md §5
--
-- Reuses the existing public.is_team_member() helper (defined in
-- 20260421000001_team_members_view.sql / 20260421000002_team_members_rpc.sql).
-- Existing tables (creators, brands, api_tokens) follow the convention
--   create policy "team members full access" ... using (is_team_member()) ...
-- so the new tables match.
--
-- The new creators_self_read policy is additive: team members keep their
-- existing "team members full access" coverage and creators bound to an
-- auth.users row gain read access to their own creators row only.

alter table products enable row level security;
alter table matches enable row level security;
alter table eval_videos enable row level security;

-- products: admins full; creators read products attached to one of their matches
create policy "team members full access" on products
  for all
  using (is_team_member())
  with check (is_team_member());

create policy products_creator_read on products
  for select
  to authenticated
  using (
    exists (
      select 1
      from matches m
      join creators c on c.id = m.creator_id
      where m.product_id = products.id
        and c.auth_user_id = auth.uid()
    )
  );

-- matches: admins full; creators read + update their own matches
create policy "team members full access" on matches
  for all
  using (is_team_member())
  with check (is_team_member());

create policy matches_creator_read on matches
  for select
  to authenticated
  using (
    exists (
      select 1 from creators
      where creators.id = matches.creator_id
        and creators.auth_user_id = auth.uid()
    )
  );

create policy matches_creator_update on matches
  for update
  to authenticated
  using (
    exists (
      select 1 from creators
      where creators.id = matches.creator_id
        and creators.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from creators
      where creators.id = matches.creator_id
        and creators.auth_user_id = auth.uid()
    )
  );

-- eval_videos: admins full; creators read + insert (no update/delete)
create policy "team members full access" on eval_videos
  for all
  using (is_team_member())
  with check (is_team_member());

create policy eval_videos_creator_read on eval_videos
  for select
  to authenticated
  using (
    exists (
      select 1
      from matches m
      join creators c on c.id = m.creator_id
      where m.id = eval_videos.match_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy eval_videos_creator_insert on eval_videos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from matches m
      join creators c on c.id = m.creator_id
      where m.id = eval_videos.match_id
        and c.auth_user_id = auth.uid()
    )
  );

-- creators: keep the existing "team members full access" policy (added in
-- a prior migration) and add a read-only policy for the bound auth user.
create policy creators_self_read on creators
  for select
  to authenticated
  using (auth.uid() = auth_user_id);
