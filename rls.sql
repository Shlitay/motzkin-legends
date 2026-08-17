-- Row Level Security policies for Motzkin Legends.
-- Run in the Supabase SQL editor AFTER schema.sql.
--
-- Every real user logs in via Google OAuth, so all policies target
-- `authenticated` — there's no need for public/anon access anywhere.
--
-- Known limitation: prediction insert/update isn't deadline-checked here
-- (no `now() < matches.kickoff_at` guard yet) — enforced app-side for now.

-- ---------------------------------------------------------
-- Helper: is the current user the manager?
-- security definer so it isn't itself blocked by users' own RLS.
-- ---------------------------------------------------------
create function is_manager()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'manager'
  );
$$;

-- ---------------------------------------------------------
-- USERS
-- Anyone logged in can read everyone's profile (names/avatars show up
-- throughout the UI — leaderboard, approval lists, etc). You can only
-- update your own row.
-- ---------------------------------------------------------
alter table users enable row level security;

create policy "users_select_all_authenticated"
  on users for select
  to authenticated
  using (true);

create policy "users_update_own_row"
  on users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent a participant from promoting themselves to manager (or a manager
-- accidentally demoting themselves) through the update policy above — role
-- can only change via the service role key (a manual admin action).
create function prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role can only be changed by the service role';
  end if;
  return new;
end;
$$;

create trigger lock_role_column
  before update on users
  for each row execute function prevent_role_escalation();

-- ---------------------------------------------------------
-- SCORING RULES / SEASONS / ROUNDS / TEAMS / MATCHES
-- Everyone can read; only the manager can write.
-- ---------------------------------------------------------
alter table scoring_rules enable row level security;
alter table seasons enable row level security;
alter table rounds enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;

create policy "scoring_rules_select_all" on scoring_rules for select to authenticated using (true);
create policy "scoring_rules_manager_write" on scoring_rules for all to authenticated
  using (is_manager()) with check (is_manager());

create policy "seasons_select_all" on seasons for select to authenticated using (true);
create policy "seasons_manager_write" on seasons for all to authenticated
  using (is_manager()) with check (is_manager());

create policy "rounds_select_all" on rounds for select to authenticated using (true);
create policy "rounds_manager_write" on rounds for all to authenticated
  using (is_manager()) with check (is_manager());

create policy "teams_select_all" on teams for select to authenticated using (true);
create policy "teams_manager_write" on teams for all to authenticated
  using (is_manager()) with check (is_manager());

create policy "matches_select_all" on matches for select to authenticated using (true);
create policy "matches_manager_write" on matches for all to authenticated
  using (is_manager()) with check (is_manager());

-- ---------------------------------------------------------
-- PREDICTIONS
-- Owner can read/write their own; manager can read everyone's (to review —
-- scoring itself will be computed server-side, not via a client write).
-- ---------------------------------------------------------
alter table predictions enable row level security;

create policy "predictions_select_own_or_manager"
  on predictions for select
  to authenticated
  using (user_id = auth.uid() or is_manager());

create policy "predictions_insert_own"
  on predictions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "predictions_update_own"
  on predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------
-- ROUND PARTICIPATION
-- Everyone can read (it's literally the leaderboard). A participant can
-- request approval for themselves (insert their own 'waiting' row); only
-- the manager can approve/reject/score, or add/remove anyone else.
-- ---------------------------------------------------------
alter table round_participation enable row level security;

create policy "round_participation_select_all"
  on round_participation for select
  to authenticated
  using (true);

create policy "round_participation_self_request"
  on round_participation for insert
  to authenticated
  with check (user_id = auth.uid() and payment_status = 'waiting');

create policy "round_participation_manager_write"
  on round_participation for all
  to authenticated
  using (is_manager())
  with check (is_manager());
