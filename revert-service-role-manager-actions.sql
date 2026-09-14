-- Reverts allow-service-role-manager-actions.sql (migration 36). The
-- scheduled 365scores score-update automation this supported has been
-- cancelled — the user is going back to updating results manually — so
-- there's no longer a reason for a bare service-role key to be able to
-- call submit_match_result()/set_main_event() as if it were a real
-- manager. Restores is_manager() to its original, narrower definition:
-- only a real logged-in user with public.users.role = 'manager'.
--
-- Run once in the Supabase SQL editor.

create or replace function is_manager()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'manager'
  );
$$;
