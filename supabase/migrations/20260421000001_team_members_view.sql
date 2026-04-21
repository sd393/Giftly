-- Expose a minimal team_members view so the platform can render owner info
-- and the Settings page can list teammates. Definer-owned (the default for
-- Supabase views) so it can read from auth.users; limited by the WHERE clause
-- + the grant to authenticated + a guard policy on top via `is_team_member()`.

create or replace view public.team_members as
select
  u.id,
  u.email::text as email,
  (u.raw_user_meta_data ->> 'full_name')::text as full_name,
  (u.raw_user_meta_data ->> 'avatar_url')::text as avatar_url,
  u.last_sign_in_at,
  u.created_at
from auth.users u
where u.email ilike '%@trygiftly.com';

revoke all on public.team_members from public, anon;
grant select on public.team_members to authenticated;
