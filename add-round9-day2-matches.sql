-- Adds round 9's 2nd day (Sunday 1.11.2026): 3 matches on top of
-- migration 55's Saturday 5 -- same multi-day-round pattern as rounds
-- 7-8, per-day locking handles it with no app-code change. Source:
-- user-provided 365scores screenshots, 2026-10-28.
--
-- Kickoffs treated as Israel-local, IST (UTC+2), so -2h. Liverpool-
-- Arsenal 18:30 Israel = 16:30 UK (GMT); Juventus-Napoli 21:45 Israel =
-- 20:45 Italy (CET), the standard Serie A Sunday-night slot.
--
-- All 6 teams already exist in `teams`/`TEAM_LOGOS`. Liverpool and
-- Napoli were only linked to Champions League
-- (add-champions-league-remaining-teams.sql), so they get their domestic
-- leagues here too.
--
-- Looks up round 9 by round_number -- must run after migration 55
-- (seed-round9.sql).

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Premier League'
where t.name = 'ליברפול'
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Serie A'
where t.name = 'נאפולי'
on conflict do nothing;

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from rounds r,
(values
  ('ליברפול',         'ארסנל',            '2026-11-01T16:30:00Z'::timestamptz),
  ('מכבי פתח תקווה',  'הפועל באר שבע',    '2026-11-01T18:00:00Z'::timestamptz),
  ('יובנטוס',         'נאפולי',           '2026-11-01T19:45:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at)
where r.round_number = 9;
