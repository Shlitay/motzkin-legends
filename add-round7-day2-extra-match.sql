-- Adds one more match to round 7's Sunday 18.10.2026 (migration 45's
-- day already has 3 -- this makes 4): Real Madrid-Sevilla, La Liga.
-- Both teams already exist in `teams`/`TEAM_LOGOS` (Sevilla since
-- 2026-09-16, Real Madrid since the Champions League roster), no new
-- crests needed. Source: user-provided screenshot, checked 2026-10-15.
-- Kickoff (22:00) treated as already Israel-local -- a standard 21:00
-- CEST La Liga evening slot, same +1h Israel-vs-Spain reasoning as
-- round 6's European kickoffs, not explicitly re-confirmed. Converted
-- to UTC (-3h) for storage.
--
-- Looks up round 7 by round_number, not by season -- must run after
-- migration 44 (seed-round7.sql), since it's a silent no-op if round 7
-- doesn't exist yet. Independent of migrations 45/46 otherwise.

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('ריאל מדריד', 'סביליה', '2026-10-18T19:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 7;
