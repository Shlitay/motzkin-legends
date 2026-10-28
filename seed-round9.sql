-- Seeds round 9's Saturday matches into the existing 2026/27 season --
-- 4 Israeli Premier League fixtures + Bayern-Dortmund (Bundesliga), all
-- Saturday 31.10.2026. Run once in the SQL editor (not idempotent,
-- matching every prior seed-roundN.sql). Creating round 9 as 'open'
-- cuts every page over to it automatically -- rounds 1-8 stay browsable
-- read-only. More days' matches, if any, get added by separate
-- add-round9-*.sql files (same pattern as rounds 7-8).
--
-- Source: user-provided 365scores screenshots, 2026-10-28. Kickoffs
-- treated as Israel-local. First seed fully after DST ended (25.10), so
-- Israel is IST (UTC+2): converted with -2h. Bayern-Dortmund at 19:30
-- Israel = 18:30 in Germany (CET), a normal Bundesliga Saturday slot.
--
-- Every team already exists in teams and TEAM_LOGOS. Bayern was only
-- linked to Champions League (add-champions-league-remaining-teams.sql),
-- so it's linked to Bundesliga here too.
--
-- season_id hardcoded directly, per the seed-round6.sql lesson.
-- predictions_open_at intentionally left unset, per migration 34.
-- deadline_at is the first kickoff (Beitar-Kiryat Shmona, 15:00 Israel
-- time = 13:00 UTC).

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Bundesliga'
where t.name = 'באיירן מינכן'
on conflict do nothing;

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 9, '2026-10-31T13:00:00Z'::timestamptz, 'open')
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('בית"ר ירושלים',      'הפועל קריית שמונה',  '2026-10-31T13:00:00Z'::timestamptz),
  ('הפועל חיפה',         'הפועל פתח תקווה',    '2026-10-31T15:30:00Z'::timestamptz),
  ('בני סכנין',          'עירוני טבריה',       '2026-10-31T16:00:00Z'::timestamptz),
  ('מכבי נתניה',         'הפועל ירושלים',      '2026-10-31T17:30:00Z'::timestamptz),
  ('באיירן מינכן',       'דורטמונד',           '2026-10-31T17:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
