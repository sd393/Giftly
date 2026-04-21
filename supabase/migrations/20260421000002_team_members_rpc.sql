-- Replace the team_members view with an RPC function. The view triggered the
-- "auth.users exposed" advisor even though the WHERE clause limited rows to
-- the company domain. A security-definer function with an explicit
-- is_team_member() guard avoids the advisor while still letting team members
-- enumerate each other for owner-pickers, the Settings page, etc.

drop view if exists public.team_members;

create or replace function public.list_team_members()
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth
as $$
  select
    u.id,
    u.email::text,
    (u.raw_user_meta_data ->> 'full_name')::text,
    (u.raw_user_meta_data ->> 'avatar_url')::text,
    u.last_sign_in_at,
    u.created_at
  from auth.users u
  where
    u.email ilike '%@trygiftly.com'
    and public.is_team_member();
$$;

revoke all on function public.list_team_members from public, anon;
grant execute on function public.list_team_members to authenticated;
