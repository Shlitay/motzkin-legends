-- Adds round 8's 2nd day (Sunday 25.10.2026): 1 match on top of
-- seed-round8.sql's Saturday 7 -- same multi-day-round pattern as
-- round 4/7, per-day locking already handles it with no app-code
-- change. Both teams already exist in `teams`/`TEAM_LOGOS`, no new
-- crests needed. Source: user-provided screenshot, checked 2026-10-20.
--
-- Real timezone wrinkle: 25.10.2026 is the exact day Israel's DST
-- (IDT, UTC+3) ends -- the clocks move back to IST (UTC+2) at 2am that
-- morning. This match kicks off at 20:15, well after that, so unlike
-- every single match seeded before it (including this same round's
-- Saturday 7, still on IDT), this one converts with -2h, not -3h:
-- 20:15 Israel-local = 18:15 UTC. The next round's seed should double
-- check which offset applies per-match if it spans this same boundary.
--
-- Looks up round 8 by round_number, not by season -- must run after
-- seed-round8.sql, since it's a silent no-op if round 8 doesn't exist.

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('הפועל פתח תקווה', 'בית"ר ירושלים', '2026-10-25T18:15:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 8;
