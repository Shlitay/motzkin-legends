-- Adds round 7's 3rd day (Monday 19.10.2026): 1 more match on top of
-- migrations 44/45's Saturday+Sunday 8 -- same multi-day-round pattern,
-- per-day locking already handles a 3rd day with no app-code change.
-- Both teams already exist in `teams`/`TEAM_LOGOS`, no new crests
-- needed. Source: user-provided screenshot, checked 2026-10-15.
-- Kickoff (20:30) is a straightforward Israeli fixture, already
-- Israel-local, no conversion ambiguity like the European matches on
-- day 2 -- converted to UTC (-3h) for storage.
--
-- Looks up round 7 by round_number, not by season -- must run after
-- migrations 44 and 45, since it's a silent no-op if round 7 doesn't
-- exist yet.

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('בית"ר ירושלים', 'מכבי תל אביב', '2026-10-19T17:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 7;
