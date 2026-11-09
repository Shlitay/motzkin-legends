-- Single-paste seed for round 11. Run it only once, since matches has no
-- unique constraint guarding against duplicate rows on a second run.
--
-- Creates round 11 (status 'open', deadline = first kickoff) and its
-- matches. All times IST (UTC+2, -2h):
--   Sat 28.11 (5): Israeli Premier League
--   Sun 29.11 (4): Arsenal-Man City, Dortmund-Leverkusen, Lyon-Monaco,
--                  Como-Juventus
--   Mon 30.11 (2): Maccabi Netanya-Hapoel Beer Sheva, Espanyol-Getafe
-- Source: user-provided screenshots, 2026-11-09. Left team is home (LTR).
--
-- Five new teams: Lyon and Monaco (Ligue 1), Bayer Leverkusen (Bundesliga),
-- Espanyol and Getafe (La Liga).
-- team_api_ids rows added for this round's teams the score feed didn't know
-- yet, so its matches link to API-Football automatically. predictions_open_at
-- intentionally left unset, per migration 34. season_id hardcoded directly,
-- per the seed-round6.sql lesson.

insert into teams (name) values
  ('ליון'),            -- Lyon
  ('מונאקו'),          -- Monaco
  ('באייר לברקוזן'),   -- Bayer Leverkusen
  ('אספניול'),         -- Espanyol
  ('חטאפה')            -- Getafe
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Ligue 1'
where t.name in ('ליון', 'מונאקו')
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Bundesliga'
where t.name = 'באייר לברקוזן'
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'La Liga'
where t.name in ('אספניול', 'חטאפה')
on conflict do nothing;

insert into team_api_ids (team_name, api_team_id, api_name) values
  ('מכבי תל אביב',    604, 'Maccabi Tel Aviv'),
  ('ארסנל',           42,  'Arsenal'),
  ('מנצ׳סטר סיטי',    50,  'Manchester City'),
  ('ליון',            80,  'Lyon'),
  ('מונאקו',          91,  'Monaco'),
  ('דורטמונד',        165, 'Borussia Dortmund'),
  ('באייר לברקוזן',   168, 'Bayer Leverkusen'),
  ('קומו',            895, 'Como'),
  ('יובנטוס',         496, 'Juventus'),
  ('אספניול',         540, 'Espanyol'),
  ('חטאפה',           546, 'Getafe')
on conflict (team_name) do nothing;

insert into rounds (season_id, round_number, deadline_at, status)
values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 11, '2026-11-28T13:00:00Z'::timestamptz, 'open');

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  -- Saturday 28.11
  ('בני סכנין',         'מכבי חיפה',          '2026-11-28T13:00:00Z'::timestamptz),
  ('הפועל רמת גן',      'הפועל קריית שמונה',  '2026-11-28T15:30:00Z'::timestamptz),
  ('הפועל חיפה',        'עירוני טבריה',       '2026-11-28T16:00:00Z'::timestamptz),
  ('מכבי תל אביב',      'הפועל פתח תקווה',    '2026-11-28T17:00:00Z'::timestamptz),
  ('בית"ר ירושלים',     'הפועל ירושלים',      '2026-11-28T18:00:00Z'::timestamptz),
  -- Sunday 29.11
  ('ארסנל',             'מנצ׳סטר סיטי',       '2026-11-29T16:30:00Z'::timestamptz),
  ('דורטמונד',          'באייר לברקוזן',      '2026-11-29T18:30:00Z'::timestamptz),
  ('ליון',              'מונאקו',             '2026-11-29T19:45:00Z'::timestamptz),
  ('קומו',              'יובנטוס',            '2026-11-29T19:45:00Z'::timestamptz),
  -- Monday 30.11
  ('מכבי נתניה',        'הפועל באר שבע',      '2026-11-30T18:00:00Z'::timestamptz),
  ('אספניול',           'חטאפה',              '2026-11-30T20:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 11;
