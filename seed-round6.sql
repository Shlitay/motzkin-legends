-- Seeds round 6's 18 matches into the existing 2026/27 season -- the
-- first round that's entirely Champions League (no Israeli Premier
-- League fixtures at all), matching the full 36-team CL league-phase
-- matchday: every one of the 36 teams seeded in add-champions-league.sql
-- / add-champions-league-remaining-teams.sql plays exactly once. Run
-- once in the SQL editor (not idempotent, matching seed-round1-5.sql).
-- Creating round 6 as 'open' cuts every page over to it automatically
-- (getCurrentRound() picks the highest round_number regardless of
-- status) -- rounds 1-5 stay browsable read-only.
--
-- Source: user-provided screenshots, checked 2026-09-28. Matches play
-- Tue 13.10.2026 and Wed 14.10.2026, kickoffs at 19:45 or 22:00. Treated
-- as already Israel-local (these line up exactly with the real UEFA CL
-- 18:45/21:00 CET slots -- Israel runs one hour ahead of CET on these
-- dates, before Europe's and Israel's DST both end ~25.10.2026), same
-- convention as round 5's European matches. Converted to UTC (-3h) for
-- storage.
--
-- predictions_open_at intentionally not set, per migration 34's "future
-- seeds should stop setting that column."
--
-- deadline_at is the first match's kickoff (Sabah-Slavia Praha, 13.10
-- 19:45 Israel time = 16:45 UTC), matching every prior round's
-- "deadline = first kickoff" convention.
--
-- Most of these 30 teams (everyone except Inter, Barcelona, Arsenal,
-- Stuttgart, Dortmund, Roma) have no TEAM_LOGOS crest yet -- fine for
-- the seed itself, matches will just render without a crest until
-- crests are added separately.

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  select id, 6, '2026-10-13T16:45:00Z'::timestamptz, 'open'
  from seasons
  where name = '2026/27 Season'
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('סבאח',              'סלאביה פראג',       '2026-10-13T16:45:00Z'::timestamptz),
  ('לאנס',              'ספורטינג',          '2026-10-13T16:45:00Z'::timestamptz),
  ('ויאריאל',           'נאפולי',            '2026-10-13T19:00:00Z'::timestamptz),
  ('ויקינג',            'באיירן מינכן',      '2026-10-13T19:00:00Z'::timestamptz),
  ('אתלטיקו מדריד',     'מנצ׳סטר יונייטד',   '2026-10-13T19:00:00Z'::timestamptz),
  ('אינטר מילאן',       'קלאב בריז׳',        '2026-10-13T19:00:00Z'::timestamptz),
  ('לייפציג',           'PSV איינדהובן',     '2026-10-13T19:00:00Z'::timestamptz),
  ('גלטסראיי',          'ברצלונה',           '2026-10-13T19:00:00Z'::timestamptz),
  ('ארסנל',             'ליל',               '2026-10-13T19:00:00Z'::timestamptz),
  ('לאסק לינץ',         'ליברפול',           '2026-10-14T16:45:00Z'::timestamptz),
  ('פיינורד',           'קומו',              '2026-10-14T16:45:00Z'::timestamptz),
  ('סלובאן ברטיסלבה',   'שטוטגרט',           '2026-10-14T19:00:00Z'::timestamptz),
  ('בודו/גלימט',        'דורטמונד',          '2026-10-14T19:00:00Z'::timestamptz),
  ('שחטאר דונייצק',     'איאק אתונה',        '2026-10-14T19:00:00Z'::timestamptz),
  ('מנצ׳סטר סיטי',      'פריז סן ז׳רמן',     '2026-10-14T19:00:00Z'::timestamptz),
  ('רומא',              'ריאל מדריד',        '2026-10-14T19:00:00Z'::timestamptz),
  ('בטיס',              'פורטו',             '2026-10-14T19:00:00Z'::timestamptz),
  ('אסטון וילה',        'פנרבחצ׳ה',          '2026-10-14T19:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
