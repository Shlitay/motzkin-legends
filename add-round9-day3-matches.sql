-- Adds round 9's 3rd day (Monday 2.11.2026): 2 matches on top of
-- migrations 55/56's Saturday+Sunday 8, bringing round 9 to 10. Source:
-- user-provided 365scores screenshot, 2026-10-28.
--
-- All 4 teams already exist in `teams`/`TEAM_LOGOS`, no new crests or
-- league links needed. IST (UTC+2): 20:30 Israel-local = 18:30 UTC.
--
-- Looks up round 9 by round_number -- must run after migration 55
-- (seed-round9.sql); independent of migration 56 otherwise.

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('הפועל רמת גן',   'מכבי תל אביב',  '2026-11-02T18:30:00Z'::timestamptz),
  ('הפועל תל אביב',  'מכבי חיפה',     '2026-11-02T18:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 9;
