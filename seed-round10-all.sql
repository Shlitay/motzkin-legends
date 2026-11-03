-- Single-paste seed for round 10. Fixtures are being added to this file
-- as they come in -- paste it into Supabase only once the round is
-- complete, and only once, since matches has no unique constraint
-- guarding against duplicate rows on a second run.
--
-- Creates round 10 (status 'open', deadline = first kickoff) and its
-- matches. All times IST (UTC+2, -2h):
--   Sat 7.11 (5): 5 Israeli Premier League
-- Source: user-provided 365scores screenshot, 2026-11-03.
--
-- No new teams. predictions_open_at intentionally left unset, per
-- migration 34. season_id hardcoded directly, per the seed-round6.sql
-- lesson.

insert into rounds (season_id, round_number, deadline_at, status)
values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 10, '2026-11-07T13:00:00Z'::timestamptz, 'open');

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  -- Saturday 7.11
  ('הפועל פתח תקווה',    'הפועל רמת גן',       '2026-11-07T13:00:00Z'::timestamptz),
  ('מכבי חיפה',          'מכבי נתניה',         '2026-11-07T15:30:00Z'::timestamptz),
  ('הפועל ירושלים',      'בני סכנין',          '2026-11-07T16:00:00Z'::timestamptz),
  ('הפועל קריית שמונה',  'הפועל חיפה',         '2026-11-07T16:00:00Z'::timestamptz),
  ('עירוני טבריה',       'בית"ר ירושלים',      '2026-11-07T17:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 10;
