-- Adds round 7's 2nd day (Sunday 18.10.2026): 3 more matches on top of
-- the 5 Saturday Israeli Premier League ones from seed-round7.sql --
-- same multi-day-round pattern as round 4 (per-day locking already
-- handles this with no code changes needed). Run seed-round7.sql FIRST
-- if it hasn't run yet -- this looks up round 7 by round_number, not by
-- season, so it's a silent no-op (0 rows) if round 7 doesn't exist.
--
-- Two of these 3 teams are brand new: Juventus and Lazio (Serie A) and
-- Leeds (Premier League) -- none were on the 36-team Champions League
-- list the user gave 2026-09-28, so NOT linked to Champions League,
-- only their real domestic league. Added names-only (no crests/colors
-- yet), same as the 30-team CL batch -- ask for crest URLs separately.
--
-- Source: user-provided screenshots, checked 2026-10-15. Kickoffs
-- (21:45 Juventus-Lazio, 16:00 Leeds-Man Utd, 20:15 Hapoel Beer
-- Sheva-Hapoel Jerusalem) treated as already Israel-local -- 21:45
-- lines up with a standard 20:45 CET Serie A Sunday-night slot, 16:00
-- with a standard 14:00 BST early Premier League slot (Israel runs 2h
-- ahead of UK's BST, 1h ahead of Italy's CEST, in mid-October before
-- either country's DST ends) -- same reasoning as round 6's European
-- kickoffs, not explicitly re-confirmed this time. Flag if wrong.
-- Converted to UTC (-3h) for storage.
--
-- round 7's deadline_at (set in seed-round7.sql to Saturday's first
-- kickoff) is untouched -- still the earliest match in the round
-- overall, so the existing "deadline = first kickoff" convention holds
-- without any change here.

insert into teams (name) values
  ('יובנטוס'),  -- Juventus
  ('לאציו'),    -- Lazio
  ('לידס')      -- Leeds
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Serie A'
where t.name in ('יובנטוס', 'לאציו')
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Premier League'
where t.name = 'לידס'
on conflict do nothing;

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('יובנטוס',            'לאציו',               '2026-10-18T18:45:00Z'::timestamptz),
  ('לידס',               'מנצ׳סטר יונייטד',     '2026-10-18T13:00:00Z'::timestamptz),
  ('הפועל באר שבע',      'הפועל ירושלים',       '2026-10-18T17:15:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 7;
