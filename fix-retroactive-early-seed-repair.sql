-- One-time DATA repair (not a function change): undoes the effect of the
-- pre-migration-19 lock_expired_rounds(), which seeded EVERY unscored
-- match in a locked round to 0-0 the moment the round locked, ignoring
-- that match's own kickoff_at. Migration 19 (update-lock-expired-rounds-
-- per-match-kickoff.sql) fixed the function so this can't happen again,
-- but it doesn't retroactively clean up matches that were already
-- force-seeded to 0-0 while still days from actually kicking off — those
-- still have home_score/away_score = 0, is_final = false, and
-- predictions.points_earned computed against that fake result, so
-- round_participation.total_points (a cached sum) is still wrong until
-- this runs.
--
-- Safe heuristic: a match whose kickoff_at is still in the future cannot
-- have a real score by definition, so ANY score present on such a match
-- is leftover bad seeding, not a real manager-entered result.
--
-- Run once in the SQL editor, then check /leaderboard.

-- 1. Wipe the fake 0-0 (and is_final flag) off matches that haven't
--    actually kicked off yet.
update matches
set home_score = null, away_score = null, is_final = false
where kickoff_at > now()
  and home_score is not null;

-- 2. Wipe the points that were computed against that fake result.
update predictions p
set points_earned = null
from matches m
where p.match_id = m.id
  and m.kickoff_at > now();

-- 3. Recompute cached standings for every round that could have been
--    affected (locked or finished rounds).
do $$
declare
  r record;
begin
  for r in select id from rounds where status in ('locked', 'finished') loop
    perform recompute_round_standings(r.id);
  end loop;
end;
$$;
