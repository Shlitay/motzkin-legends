-- Adds an 11th match to round 9 (already live via migration 58):
-- Boca Juniors-River Plate (Superclásico), Sunday 1.11.2026. Source:
-- user-provided 365scores screenshot, 2026-10-28.
--
-- Kickoff treated as Israel-local like every other match: 20:00 IST
-- (UTC+2) = 18:00 UTC (15:00 in Buenos Aires, UTC-3).
--
-- Both teams are brand new -- first non-European, non-Israeli clubs in
-- the app. Added names-only, plus a new 'Liga Profesional Argentina'
-- league they're linked to. Re-runnable for the teams/league parts
-- (on conflict do nothing); the match insert is not.
--
-- Looks up round 9 by round_number.

insert into leagues (name) values ('Liga Profesional Argentina')
on conflict (name) do nothing;

insert into teams (name) values
  ('בוקה ג׳וניורס'),  -- Boca Juniors
  ('ריבר פלייט')      -- River Plate
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Liga Profesional Argentina'
where t.name in ('בוקה ג׳וניורס', 'ריבר פלייט')
on conflict do nothing;

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, 'בוקה ג׳וניורס', 'ריבר פלייט', '2026-11-01T18:00:00Z'::timestamptz
from rounds r
where r.round_number = 9;
