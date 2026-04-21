-- The pre-existing creators/brands migration enabled RLS but never granted
-- the `authenticated` role any table privileges, so session-authed reads from
-- the internal platform hit "permission denied for table X" before RLS ever
-- evaluated. Grant CRUD to authenticated; RLS policies (is_team_member())
-- still filter what they see.

grant select, insert, update, delete on public.creators          to authenticated;
grant select, insert, update, delete on public.brands            to authenticated;
grant select, insert, update, delete on public.api_tokens        to authenticated;
grant select, insert, update, delete on public.outbound_messages to authenticated;
grant select, insert, update, delete on public.outbound_tasks    to authenticated;
