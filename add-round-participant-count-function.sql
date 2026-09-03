-- Migration 30: fixes the round-winner payout badge still showing 0 after
-- fix-season-stats-rounds-played-v2.sql. That fix queried `predictions`
-- directly from the browser (leaderboard/page.tsx) to count distinct
-- participants for the selected round — but that query is fully subject
-- to RLS for whoever's logged in. Once round 2's approvals were reset
-- (payment_status back to 'waiting', prepping round 3's signups), the
-- VIEWER themselves may no longer satisfy predictions_select_locked_round
-- for round 2, so they could only see their own predictions, not
-- everyone's — undercounting the pot to almost nothing.
--
-- Fix: a security-definer function, same mechanism is_manager() already
-- uses, so it returns the correct count regardless of the querying
-- user's own current approval status for that round.

create function round_participant_count(p_round_id uuid)
returns int
language sql
security definer
stable
as $$
  select count(distinct p.user_id)::int
  from predictions p
  join matches m on m.id = p.match_id
  where m.round_id = p_round_id;
$$;

grant execute on function round_participant_count(uuid) to authenticated;

-- Belt-and-suspenders on season_stats too (migration 29's rounds_played
-- fix uses the same kind of `exists (select ... from predictions ...)`
-- subquery, inside a view rather than a direct client query — views
-- default to running with the view owner's permissions in Postgres 15+,
-- which should already bypass RLS the same way, but pin it explicitly
-- rather than relying on that default going unchanged.
alter view season_stats set (security_invoker = false);
