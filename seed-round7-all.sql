-- Single-paste convenience version of round 7's full seed: everything
-- migrations 44-47 do, combined into one script to run once instead of
-- four separate pastes. Those four files remain the authoritative,
-- individually-documented migration history (see README) -- run
-- EITHER this file OR 44+45+46+47 in order, never both, since matches
-- has no unique constraint guarding against duplicate rows on a
-- second run.
--
-- Creates round 7 (status 'open', deadline = Saturday's first kickoff)
-- and all 10 matches across 3 days:
--   Sat 17.10 (5): Israeli Premier League
--   Sun 18.10 (4): 3 Israeli/European mixed + Real Madrid-Sevilla
--   Mon 19.10 (1): Beitar Jerusalem-Maccabi Tel Aviv
-- Adds 3 new teams (Juventus, Lazio, Leeds), linked to their real
-- domestic league only (none are on the Champions League roster).
-- season_id hardcoded directly, not looked up by name, per the
-- seed-round6.sql typo lesson (seasons.name is '2026/27 Seasor', a
-- pre-existing typo). All kickoffs converted to UTC (-3h) from
-- Israel-local.

insert into rounds (season_id, round_number, deadline_at, status)
values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 7, '2026-10-17T15:45:00Z'::timestamptz, 'open');

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
  -- Saturday 17.10
  ('הפועל תל אביב',      'עירוני טבריה',       '2026-10-17T15:45:00Z'::timestamptz),
  ('הפועל חיפה',         'הפועל רמת גן',        '2026-10-17T16:00:00Z'::timestamptz),
  ('בני סכנין',          'הפועל פתח תקווה',     '2026-10-17T16:15:00Z'::timestamptz),
  ('מכבי נתניה',         'הפועל קריית שמונה',   '2026-10-17T16:15:00Z'::timestamptz),
  ('מכבי פתח תקווה',     'מכבי חיפה',           '2026-10-17T16:30:00Z'::timestamptz),
  -- Sunday 18.10
  ('יובנטוס',            'לאציו',               '2026-10-18T18:45:00Z'::timestamptz),
  ('לידס',               'מנצ׳סטר יונייטד',     '2026-10-18T13:00:00Z'::timestamptz),
  ('הפועל באר שבע',      'הפועל ירושלים',       '2026-10-18T17:15:00Z'::timestamptz),
  ('ריאל מדריד',         'סביליה',              '2026-10-18T19:00:00Z'::timestamptz),
  -- Monday 19.10
  ('בית"ר ירושלים',      'מכבי תל אביב',        '2026-10-19T17:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 7;
