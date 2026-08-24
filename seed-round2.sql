-- Seeds round 2's 7 matches into the existing 2026/27 season.
-- Run once in the SQL editor (not idempotent, matching seed-round1.sql).
-- Round 1 is left as-is (status 'locked', 2 matches never played) --
-- treated as a pilot and intentionally not waited out. getCurrentRound()
-- picks the round with the highest round_number regardless of status, so
-- creating round 2 as 'open' cuts every page (predictions default,
-- leaderboard, home, manager, news ticker, jackpot badge, round
-- countdown) over to round 2 cleanly the moment this runs -- round 1
-- simply stops being "current" everywhere except /predictions' prev/next
-- round picker, where it stays browsable read-only.
--
-- Source: 365scores.com Israeli Premier League, checked 2026-08-24.
-- Kickoff times are literal UTC ('Z'), per fix-round1-kickoff-times.sql's
-- finding that 365scores' displayed clock times come back as UTC, not
-- Israel-local -- the +3h conversion to Israel time happens automatically
-- via formatIsraelDeadline(), not by hand-adding an offset here.
-- Team name strings are the exact Hebrew ones already used by round 1
-- (add-hebrew-team-names.sql) so TEAM_COLORS / crests keep matching.
-- Home/away order is taken directly from the fetched fixture list --
-- worth a quick visual spot-check on /predictions once live, the way
-- round 1's order was double-checked and turned out already correct.
--
-- deadline_at is set to the first match's kickoff (2026-08-29 17:00 UTC
-- = 20:00 Israel time), matching round 1's "deadline = first kickoff"
-- convention.

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  select id, 2, '2026-08-29T17:00:00Z'::timestamptz, 'open'
  from seasons
  where name = '2026/27 Season'
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('הפועל קריית שמונה', 'עירוני טבריה',   '2026-08-29T17:00:00Z'::timestamptz),
  ('הפועל פתח תקווה',   'הפועל ירושלים',   '2026-08-29T17:00:00Z'::timestamptz),
  ('הפועל רמת גן',      'הפועל באר שבע',   '2026-08-29T17:00:00Z'::timestamptz),
  ('בני סכנין',         'מכבי פתח תקווה',  '2026-08-29T17:00:00Z'::timestamptz),
  ('בית"ר ירושלים',     'מכבי נתניה',      '2026-08-29T17:30:00Z'::timestamptz),
  ('הפועל חיפה',        'הפועל תל אביב',   '2026-08-30T17:15:00Z'::timestamptz),
  ('מכבי תל אביב',      'מכבי חיפה',       '2026-08-31T17:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
