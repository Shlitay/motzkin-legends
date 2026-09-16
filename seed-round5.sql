-- Seeds round 5's 10 matches into the existing 2026/27 season — the
-- first round using the new 10-matches-per-round format (up from 7),
-- mixing 6 Israeli Premier League fixtures with 4 European club matches
-- (see the 8 new team crests added the same day). Run once in the SQL
-- editor (not idempotent, matching seed-round1/2/3/4.sql). Creating
-- round 5 as 'open' cuts every page over to it automatically
-- (getCurrentRound() picks the highest round_number regardless of
-- status) — rounds 1-4 stay browsable read-only.
--
-- Source: user-provided screenshots, checked 2026-09-19. All 10 matches
-- play Saturday 19.9.2026. Kickoff times were confirmed already
-- Israel-local as shown (not the European matches' own country time),
-- converted to UTC (-3h) for storage, same convention as every prior
-- round. predictions_open_at is intentionally not set at all — the
-- Thursday-20:00 restriction was dropped entirely in migration 34, and
-- future seeds are meant to stop setting that column.
--
-- deadline_at is the first match's kickoff (Brighton-Arsenal, 17:00
-- Israel time = 14:00 UTC), matching every prior round's
-- "deadline = first kickoff" convention.

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  select id, 5, '2026-09-19T14:00:00Z'::timestamptz, 'open'
  from seasons
  where name = '2026/27 Season'
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('בני סכנין',          'הפועל רמת גן',    '2026-09-19T16:30:00Z'::timestamptz),
  ('מכבי פתח תקווה',      'הפועל ירושלים',   '2026-09-19T16:30:00Z'::timestamptz),
  ('מכבי נתניה',          'מכבי תל אביב',    '2026-09-19T17:00:00Z'::timestamptz),
  ('מכבי חיפה',           'עירוני טבריה',    '2026-09-19T17:00:00Z'::timestamptz),
  ('הפועל באר שבע',       'הפועל קריית שמונה','2026-09-19T17:15:00Z'::timestamptz),
  ('בית"ר ירושלים',       'הפועל חיפה',      '2026-09-19T17:30:00Z'::timestamptz),
  ('שטוטגרט',             'דורטמונד',        '2026-09-19T16:30:00Z'::timestamptz),
  ('רומא',                'אינטר מילאן',     '2026-09-19T16:00:00Z'::timestamptz),
  ('ברייטון',             'ארסנל',           '2026-09-19T14:00:00Z'::timestamptz),
  ('סביליה',              'ברצלונה',         '2026-09-19T19:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
