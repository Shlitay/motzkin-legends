-- Season 2, new round 2 (added 2026-11-18). The owner slotted a new round in
-- before the already-seeded 28–30.11 round, so:
--
-- 1) The current season-2 round 2 (the old round 11, Sat 28.11 – Mon 30.11)
--    becomes round 3. Matches, predictions, tiebreaker star and popup are
--    keyed by round id, so they all stay attached. Guarded by "its matches
--    start on 28.11", so re-running never renumbers the new round 2.
-- 2) New round 2, Saturday 21.11 (5 matches). Source: user-provided
--    screenshots, 2026-11-18. Left team is home (LTR). Times IST (UTC+2)
--    -> UTC -2h. Deadline = first kickoff. predictions_open_at left unset
--    (open now), per migration 34. Odds are not seeded: score_feed_odds_tick()
--    fetches them from the API after each match (add-odds-tiebreak.sql).
-- 3) Two new teams: Newcastle (Premier League) and Nice (Ligue 1). Crests in
--    public/team-logos/. team_api_ids rows (API-Football IDs) for every team
--    in this round the score feed didn't know yet.
--
-- Safe to re-run: every match is inserted only if that exact fixture isn't in
-- round 2 yet, so re-running an updated version (e.g. more days) only adds
-- what's new.

begin;

-- 1) 28–30.11 round: 2 -> 3 --------------------------------------------------
update rounds r
set round_number = 3
where r.season_id = (select id from seasons where name = 'עונה 2')
  and r.round_number = 2
  and (select min(m.kickoff_at) from matches m where m.round_id = r.id)
      >= '2026-11-28T00:00:00Z'::timestamptz
  and not exists (
    select 1 from rounds r3
    where r3.season_id = r.season_id and r3.round_number = 3
  );

-- 2) new teams ---------------------------------------------------------------
insert into teams (name) values
  ('ניוקאסל'),   -- Newcastle United
  ('ניס')        -- OGC Nice
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Premier League'
where t.name = 'ניוקאסל'
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Ligue 1'
where t.name = 'ניס'
on conflict do nothing;

-- No conflict target: skips a team that already has a row *or* an ID that's
-- already mapped, instead of failing the whole migration.
insert into team_api_ids (team_name, api_team_id, api_name) values
  ('צ׳לסי',          49,  'Chelsea'),
  ('לידס',           63,  'Leeds'),
  ('ניוקאסל',        34,  'Newcastle'),
  ('ליל',            79,  'Lille'),
  ('ניס',            84,  'Nice'),
  ('פריז סן ז׳רמן',  85,  'Paris Saint Germain'),
  ('סביליה',         536, 'Sevilla'),
  ('בטיס',           543, 'Real Betis')
on conflict do nothing;

-- 3) new round 2 -------------------------------------------------------------
insert into rounds (season_id, round_number, deadline_at, status)
select s.id, 2, '2026-11-21T15:00:00Z'::timestamptz, 'open'
from seasons s
where s.name = 'עונה 2'
on conflict (season_id, round_number) do nothing;

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, f.home_team, f.away_team, f.kickoff_at
from rounds r
join seasons s on s.id = r.season_id and s.name = 'עונה 2'
cross join (values
  -- Saturday 21.11
  ('צ׳לסי',   'לידס',           '2026-11-21T15:00:00Z'::timestamptz),
  ('ניס',     'פריז סן ז׳רמן',  '2026-11-21T16:15:00Z'::timestamptz),
  ('ניוקאסל', 'ארסנל',          '2026-11-21T17:30:00Z'::timestamptz),
  ('סביליה',  'בטיס',           '2026-11-21T17:30:00Z'::timestamptz),
  ('ליל',     'ליון',           '2026-11-21T19:45:00Z'::timestamptz)
) as f(home_team, away_team, kickoff_at)
where r.round_number = 2
  -- only the new round (its matches are all before 28.11)
  and not exists (
    select 1 from matches m
    where m.round_id = r.id and m.kickoff_at >= '2026-11-28T00:00:00Z'::timestamptz
  )
  and not exists (
    select 1 from matches m
    where m.round_id = r.id
      and m.home_team = f.home_team
      and m.away_team = f.away_team
  );

commit;

-- Check: round 2 = 5 matches on 21.11, round 3 = 11 matches on 28–30.11.
select r.round_number, count(m.id) as matches,
       min(m.kickoff_at) as first_kickoff, max(m.kickoff_at) as last_kickoff
from rounds r
join seasons s on s.id = r.season_id and s.name = 'עונה 2'
left join matches m on m.round_id = r.id
group by r.round_number
order by r.round_number;
