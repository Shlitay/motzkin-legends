-- Adds a 2nd match to round 8's Sunday 25.10.2026 (migration 51's day
-- already has 1 -- this makes 2): Barcelona-Real Madrid (El Clásico),
-- La Liga. Both teams already exist in `teams`/`TEAM_LOGOS`, no new
-- crests needed. Source: user-provided screenshot, checked 2026-10-20.
--
-- Kickoff (22:00) treated as already Israel-local. Same -2h (IST)
-- offset as migration 51's Sunday match -- Spain's own DST also ends
-- this same day (EU-wide), so the Israel-vs-Spain +1h relationship
-- holds the same both before and after, same reasoning as every prior
-- European kickoff this project has seeded. 22:00 Israel-local =
-- 20:00 UTC.
--
-- Looks up round 8 by round_number, not by season -- must run after
-- migration 50 (seed-round8.sql); independent of migrations 51/52
-- otherwise.

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('ברצלונה', 'ריאל מדריד', '2026-10-25T20:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 8;
