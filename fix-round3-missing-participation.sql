-- One-time DATA repair: round 3's round_participation table has 0 rows
-- despite round 3 being fully played and scored (7 matches, status =
-- 'finished') -- discovered 2026-09-08 while investigating /leaderboard
-- showing an empty "נקודות מחזור 3" table (query-rounds-played-audit.sql's
-- sibling diagnostic, run live, showed match_count=7 / participation_count=0
-- for round 3, vs round 2's 7/7 and round 1's 9/9). Root cause not
-- identified -- no migration in this repo ever deletes from
-- round_participation -- but predictions/matches, the actual source of
-- truth recompute_round_standings() reads from, are intact.
--
-- Backfills one round_participation row per user who has at least one
-- predictions row for one of round 3's matches (proof they actually
-- played), marked 'approved' since they clearly got real scored results,
-- then recomputes standings from predictions/matches the normal way.
-- `on conflict do nothing` + recompute's own idempotency makes this safe
-- to re-run.

insert into round_participation (user_id, round_id, payment_status)
select distinct p.user_id, r.id, 'approved'
from predictions p
join matches m on m.id = p.match_id
join rounds r on r.id = m.round_id
where r.round_number = 3
on conflict (user_id, round_id) do nothing;

select recompute_round_standings(id) from rounds where round_number = 3;
