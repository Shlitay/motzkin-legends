-- Single-paste convenience version of round 9's full seed: everything
-- migrations 55, 56, and 57 do, combined into one script (same pattern
-- as seed-round8-all.sql). Those individual files remain the
-- authoritative, individually-documented migration history (see
-- README). Run this one file OR 55+56+57 in order -- never both, since
-- matches has no unique constraint guarding against duplicate rows on a
-- second run.
--
-- Creates round 9 (status 'open', deadline = Saturday's first kickoff)
-- and all 10 matches across 3 days, all IST (UTC+2, -2h):
--   Sat 31.10 (5): 4 Israeli Premier League + Bayern-Dortmund
--   Sun 1.11  (3): Liverpool-Arsenal, Maccabi Petah Tikva-Hapoel Beer
--                  Sheva, Juventus-Napoli
--   Mon 2.11  (2): Hapoel Ramat Gan-Maccabi Tel Aviv, Hapoel Tel Aviv-
--                  Maccabi Haifa
-- No new teams. Links Bayern to Bundesliga, Liverpool to Premier
-- League, Napoli to Serie A (all three were Champions League only).
-- season_id hardcoded directly, per the seed-round6.sql lesson.

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Bundesliga'
where t.name = 'באיירן מינכן'
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Premier League'
where t.name = 'ליברפול'
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Serie A'
where t.name = 'נאפולי'
on conflict do nothing;

insert into rounds (season_id, round_number, deadline_at, status)
values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 9, '2026-10-31T13:00:00Z'::timestamptz, 'open');

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  -- Saturday 31.10
  ('בית"ר ירושלים',      'הפועל קריית שמונה',  '2026-10-31T13:00:00Z'::timestamptz),
  ('הפועל חיפה',         'הפועל פתח תקווה',    '2026-10-31T15:30:00Z'::timestamptz),
  ('בני סכנין',          'עירוני טבריה',       '2026-10-31T16:00:00Z'::timestamptz),
  ('מכבי נתניה',         'הפועל ירושלים',      '2026-10-31T17:30:00Z'::timestamptz),
  ('באיירן מינכן',       'דורטמונד',           '2026-10-31T17:30:00Z'::timestamptz),
  -- Sunday 1.11
  ('ליברפול',            'ארסנל',              '2026-11-01T16:30:00Z'::timestamptz),
  ('מכבי פתח תקווה',     'הפועל באר שבע',      '2026-11-01T18:00:00Z'::timestamptz),
  ('יובנטוס',            'נאפולי',             '2026-11-01T19:45:00Z'::timestamptz),
  -- Monday 2.11
  ('הפועל רמת גן',       'מכבי תל אביב',       '2026-11-02T18:30:00Z'::timestamptz),
  ('הפועל תל אביב',      'מכבי חיפה',          '2026-11-02T18:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 9;
