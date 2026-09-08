-- Seeds round 4's 7 matches into the existing 2026/27 season.
-- Run once in the SQL editor (not idempotent, matching
-- seed-round1.sql/seed-round2.sql/seed-round3.sql). Creating round 4 as
-- 'open' cuts every page over to it automatically (getCurrentRound()
-- picks the highest round_number regardless of status) -- rounds 1-3
-- stay browsable read-only via /predictions' and /leaderboard's
-- prev/next round pickers.
--
-- Source: user-provided 365scores.com screenshot, checked 2026-09-08.
-- Kickoff times are Israel-local as displayed, converted to UTC (-3h) for
-- storage, per the convention fix-round1-kickoff-times.sql (v2) /
-- seed-round2.sql / seed-round3.sql established. Team name strings are
-- the exact Hebrew ones already used by rounds 1-3
-- (add-hebrew-team-names.sql / TEAM_LOGOS in mock-data.ts) -- all 14
-- teams already have logos, verified byte-for-byte against the existing
-- keys (including the internal `"` in `בית"ר ירושלים`) -- no new crests
-- needed.
--
-- deadline_at is set to the first match's kickoff (2026-09-13 17:30 UTC
-- = 20:30 Israel time), matching rounds 1-3's "deadline = first
-- kickoff" convention. predictions_open_at is set directly in this
-- insert (column already exists as of add-predictions-open-at.sql) to
-- the preceding Thursday 20:00 Israel time (2026-09-10 17:00 UTC), the
-- established house rule.

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, predictions_open_at, status)
  select id, 4, '2026-09-13T17:30:00Z'::timestamptz, '2026-09-10T17:00:00Z'::timestamptz, 'open'
  from seasons
  where name = '2026/27 Season'
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('הפועל פתח תקווה',    'הפועל באר שבע',  '2026-09-13T17:30:00Z'::timestamptz),
  ('הפועל רמת גן',       'מכבי נתניה',     '2026-09-14T16:30:00Z'::timestamptz),
  ('הפועל חיפה',         'בני סכנין',      '2026-09-14T16:30:00Z'::timestamptz),
  ('הפועל קריית שמונה',  'מכבי חיפה',      '2026-09-14T17:00:00Z'::timestamptz),
  ('מכבי תל אביב',       'הפועל תל אביב',  '2026-09-14T17:30:00Z'::timestamptz),
  ('עירוני טבריה',       'הפועל ירושלים',  '2026-09-15T16:30:00Z'::timestamptz),
  ('בית"ר ירושלים',      'מכבי פתח תקווה', '2026-09-15T17:00:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
