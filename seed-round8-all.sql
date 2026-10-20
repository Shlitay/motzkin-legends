-- Single-paste convenience version of round 8's full seed: everything
-- migrations 50, 51, 52, and 54 do, combined into one script (same
-- pattern as seed-round7-all.sql). Those individual files remain the
-- authoritative, individually-documented migration history (see
-- README). Run this one file OR 50+51+52+54 in order -- never both,
-- since matches has no unique constraint guarding against duplicate
-- rows on a second run.
--
-- Creates round 8 (status 'open', deadline = Saturday's first kickoff)
-- and all 10 matches across 3 days:
--   Sat 24.10 (7): 5 Israeli Premier League + Chelsea-Tottenham +
--                  Napoli-Roma -- still Israel Daylight Time (IDT,
--                  UTC+3), converted with -3h.
--   Sun 25.10 (2): Hapoel Petah Tikva-Beitar Jerusalem (20:15) and
--                  Barcelona-Real Madrid (22:00) -- both kick off
--                  AFTER Israel's DST ends at 2am that morning, so
--                  converted with -2h (IST, UTC+2) instead.
--   Mon 26.10 (1): Maccabi Haifa-Hapoel Beer Sheva -- also IST, -2h.
-- Adds 2 new teams (Chelsea, Tottenham), linked to Premier League
-- only. season_id hardcoded directly, not looked up by name, per the
-- seed-round6.sql typo lesson.

insert into teams (name) values
  ('צ׳לסי'),    -- Chelsea
  ('טוטנהאם')   -- Tottenham
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Premier League'
where t.name in ('צ׳לסי', 'טוטנהאם')
on conflict do nothing;

insert into rounds (season_id, round_number, deadline_at, status)
values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 8, '2026-10-24T15:45:00Z'::timestamptz, 'open');

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  -- Saturday 24.10 (IDT, -3h)
  ('הפועל ירושלים',      'הפועל תל אביב',      '2026-10-24T15:45:00Z'::timestamptz),
  ('הפועל קריית שמונה',  'בני סכנין',           '2026-10-24T15:45:00Z'::timestamptz),
  ('עירוני טבריה',       'מכבי נתניה',          '2026-10-24T16:00:00Z'::timestamptz),
  ('הפועל רמת גן',       'מכבי פתח תקווה',      '2026-10-24T16:00:00Z'::timestamptz),
  ('נאפולי',             'רומא',                '2026-10-24T16:00:00Z'::timestamptz),
  ('צ׳לסי',              'טוטנהאם',             '2026-10-24T16:30:00Z'::timestamptz),
  ('מכבי תל אביב',       'הפועל חיפה',          '2026-10-24T16:30:00Z'::timestamptz),
  -- Sunday 25.10 (IST from 2am on, -2h)
  ('הפועל פתח תקווה',    'בית"ר ירושלים',       '2026-10-25T18:15:00Z'::timestamptz),
  ('ברצלונה',            'ריאל מדריד',          '2026-10-25T20:00:00Z'::timestamptz),
  -- Monday 26.10 (IST, -2h)
  ('מכבי חיפה',          'הפועל באר שבע',       '2026-10-26T17:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 8;
