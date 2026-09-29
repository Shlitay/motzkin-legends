-- One-time DATA repair: round 5's round_participation table has 0 rows
-- despite round 5 being fully played and scored (10 matches, status =
-- 'finished') -- discovered 2026-09-29 the same way round 3's identical
-- gap was found (see fix-round3-missing-participation.sql): /leaderboard
-- showing an empty "נקודות מחזור 5" table, confirmed via the same
-- match_count/participation_count diagnostic (10/0, vs round 4's 7/9).
--
-- This is the second time this exact gap has happened (round 3, then
-- round 5) -- root cause still not identified either time. Nothing in
-- this repo's migration history deletes from round_participation, and
-- real predictions data is intact: 9 distinct users, 90 rows (9 x 10,
-- everyone predicted every match) -- confirmed live before writing this.
-- sendPrediction() (predictions/page.tsx) upserts a round_participation
-- row immediately before every predictions upsert and would have errored
-- out (blocking the predictions write too) had that upsert failed, so
-- however this happened, it wasn't a simple RLS/constraint rejection on
-- that path. Worth real investigation if this happens a third time.
--
-- Backfills one round_participation row per user who has at least one
-- predictions row for one of round 5's matches (proof they actually
-- played), marked 'approved' since they clearly got real scored results,
-- then recomputes standings from predictions/matches the normal way.
-- `on conflict do nothing` + recompute's own idempotency makes this safe
-- to re-run.

insert into round_participation (user_id, round_id, payment_status)
select distinct p.user_id, r.id, 'approved'
from predictions p
join matches m on m.id = p.match_id
join rounds r on r.id = m.round_id
where r.round_number = 5
on conflict (user_id, round_id) do nothing;

select recompute_round_standings(id) from rounds where round_number = 5;
