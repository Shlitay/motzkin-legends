-- Seeds round 3's 7 matches into the existing 2026/27 season.
-- Run once in the SQL editor (not idempotent, matching seed-round1.sql /
-- seed-round2.sql). Creating round 3 as 'open' cuts every page over to it
-- automatically (getCurrentRound() picks the highest round_number
-- regardless of status) — rounds 1/2 stay browsable read-only via
-- /predictions' and /leaderboard's prev/next round pickers.
--
-- Source: user-provided 365scores.com screenshot, checked 2026-09-01.
-- Kickoff times are Israel-local as displayed, converted to UTC (-3h) for
-- storage — matches the corrected convention from
-- fix-round1-kickoff-times.sql (v2) / seed-round2.sql, not the original
-- (buggy) v1 assumption. formatIsraelDeadline() re-adds +3h for display.
-- Team name strings are the exact Hebrew ones already used by rounds 1-2
-- (add-hebrew-team-names.sql / TEAM_LOGOS in mock-data.ts) so crests keep
-- matching — all 14 teams already have logos, no new assets needed.
--
-- deadline_at is set to the first match's kickoff (2026-09-05 16:45 UTC =
-- 19:45 Israel time), matching rounds 1-2's "deadline = first kickoff"
-- convention.

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  select id, 3, '2026-09-05T16:45:00Z'::timestamptz, 'open'
  from seasons
  where name = '2026/27 Season'
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('הפועל ירושלים',     'הפועל קריית שמונה', '2026-09-05T16:45:00Z'::timestamptz),
  ('מכבי פתח תקווה',    'עירוני טבריה',       '2026-09-05T16:45:00Z'::timestamptz),
  ('מכבי חיפה',         'הפועל פתח תקווה',    '2026-09-05T17:30:00Z'::timestamptz),
  ('מכבי נתניה',        'הפועל חיפה',         '2026-09-07T16:45:00Z'::timestamptz),
  ('הפועל תל אביב',     'הפועל רמת גן',       '2026-09-07T17:00:00Z'::timestamptz),
  ('בני סכנין',         'בית"ר ירושלים',      '2026-09-07T17:15:00Z'::timestamptz),
  ('הפועל באר שבע',     'מכבי תל אביב',       '2026-09-07T17:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
