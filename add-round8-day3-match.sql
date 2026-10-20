-- Adds round 8's 3rd day (Monday 26.10.2026): 1 match on top of
-- migrations 50/51's Saturday+Sunday 8 -- same multi-day-round pattern,
-- per-day locking already handles a 3rd day with no app-code change.
-- Both teams already exist in `teams`/`TEAM_LOGOS`, no new crests
-- needed. Source: user-provided screenshot, checked 2026-10-20.
--
-- Fully past Israel's DST boundary now (ended 25.10.2026 2am), so this
-- converts with -2h (IST, UTC+2) like migration 51's Sunday match, not
-- the -3h every match before the boundary used: 19:00 Israel-local =
-- 17:00 UTC.
--
-- Looks up round 8 by round_number, not by season -- must run after
-- migration 50 (seed-round8.sql); independent of migration 51
-- otherwise.

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('מכבי חיפה', 'הפועל באר שבע', '2026-10-26T17:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 8;
