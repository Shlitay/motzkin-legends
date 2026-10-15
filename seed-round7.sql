-- Seeds round 7's 5 matches into the existing 2026/27 season -- back to
-- a plain Israeli Premier League round (no European/Champions League
-- fixtures this time). Run once in the SQL editor (not idempotent,
-- matching seed-round1-6.sql). Creating round 7 as 'open' cuts every
-- page over to it automatically (getCurrentRound() picks the highest
-- round_number regardless of status) -- rounds 1-6 stay browsable
-- read-only.
--
-- Source: user-provided screenshot, checked 2026-10-15. All 5 matches
-- play Saturday 17.10.2026, Israel-local kickoffs as shown (18:45-19:30),
-- converted to UTC (-3h) for storage -- still IDT (UTC+3) on this date,
-- before Israel's DST ends (~25.10.2026). All 10 teams already existed
-- in `teams`/TEAM_LOGOS, no new crests needed.
--
-- season_id is hardcoded directly rather than looked up by name, per the
-- lesson from seed-round6.sql's v1: `seasons.name` has a pre-existing
-- typo ('2026/27 Seasor', not 'Season'), so a `where name = ...` lookup
-- would silently match 0 rows and insert nothing. Don't switch this back
-- to a name lookup without fixing that typo first.
--
-- deadline_at is the first match's kickoff (Hapoel Tel Aviv-Ironi
-- Tiberias, 17.10 18:45 Israel time = 15:45 UTC), matching every prior
-- round's "deadline = first kickoff" convention. predictions_open_at
-- intentionally not set, per migration 34.

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 7, '2026-10-17T15:45:00Z'::timestamptz, 'open')
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('הפועל תל אביב',      'עירוני טבריה',       '2026-10-17T15:45:00Z'::timestamptz),
  ('הפועל חיפה',         'הפועל רמת גן',        '2026-10-17T16:00:00Z'::timestamptz),
  ('בני סכנין',          'הפועל פתח תקווה',     '2026-10-17T16:15:00Z'::timestamptz),
  ('מכבי נתניה',         'הפועל קריית שמונה',   '2026-10-17T16:15:00Z'::timestamptz),
  ('מכבי פתח תקווה',     'מכבי חיפה',           '2026-10-17T16:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
