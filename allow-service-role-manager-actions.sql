-- Lets the scheduled score-update automation (a cloud agent with the
-- Supabase service-role key, no real Google-OAuth manager session) call
-- the same manager-gated functions a human manager uses on /manager —
-- submit_match_result(), set_main_event() — instead of re-implementing
-- their scoring/points logic separately somewhere else.
--
-- is_manager() previously only checked "is there a logged-in user whose
-- public.users.role = 'manager'" (auth.uid()-based). A service-role
-- connection has no auth.uid() (no real user session), so it would fail
-- that check even though the service-role Postgres role already bypasses
-- RLS on every table directly — this closes that gap explicitly rather
-- than leaving the automation to bypass submit_match_result() entirely
-- and hand-roll the points math against raw tables.
--
-- auth.role() returns the Postgres role Supabase's PostgREST connects as
-- for the request; it's 'service_role' only for requests authenticated
-- with the service-role key, never for an ordinary participant or manager
-- session (those are 'authenticated'). Safe additive change — every
-- existing manager-session check keeps working exactly as before.
--
-- Run once in the Supabase SQL editor.

create or replace function is_manager()
returns boolean
language sql
security definer
stable
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1 from public.users where id = auth.uid() and role = 'manager'
    );
$$;
