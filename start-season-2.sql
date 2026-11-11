-- Season 2 starts (added 2026-11-11). The owner wanted to restart the table
-- with the Prediction Legends rebrand, keeping the old season in the
-- database (hidden from the app) instead of deleting it.
--
-- 1) New season "עונה 2" (start 2026-11-14). The current season is the one
--    with the latest start_date — current_season_id() here and
--    getCurrentSeasonId() in src/lib/currentRound.ts use the same rule.
-- 2) The already-seeded round 11 (28–30.11) moves to season 2 as round 2.
--    Its matches and any predictions already sent stay attached.
-- 3) Round 1 of season 2: Saturday 14.11, five national-team matches.
--    Source: user-provided screenshots, 2026-11-11. The team with the "1"
--    odds (right side in the RTL screenshot) is home. Times IST (UTC+2,
--    winter time) -> UTC -2h. Deadline = first kickoff. predictions_open_at
--    left unset (open now), per migration 34.
--    The ten national teams get team_api_ids rows by API-Football name
--    (ids unknown), so the score feed can match them.
-- 4) season_stats only counts the current season. Redefined from its latest
--    definition (fix-season-stats-rounds-played-v2.sql); only the join is
--    new. security_invoker = false is re-applied (from
--    add-round-participant-count-function.sql).
--
-- Safe to re-run.

begin;

-- 1) season 2 ---------------------------------------------------------------
insert into seasons (name, start_date)
select 'עונה 2', '2026-11-14'
where not exists (select 1 from seasons where name = 'עונה 2');

create or replace function current_season_id()
returns uuid
language sql
stable
as $$
  select id from seasons order by start_date desc nulls last limit 1
$$;

grant execute on function current_season_id() to authenticated;

-- 2) round 11 -> season 2, round 2 ------------------------------------------
update rounds
set season_id = (select id from seasons where name = 'עונה 2'),
    round_number = 2
where season_id = 'eca4b656-e9d8-497c-9a0e-eb20ad165ef1'
  and round_number = 11;

-- 3) round 1: national teams, Saturday 14.11 -----------------------------------
insert into leagues (name) values ('National Teams')
on conflict (name) do nothing;

insert into teams (name) values
  ('קוסובו'), ('ישראל'), ('גאורגיה'), ('הונגריה'), ('צפון אירלנד'),
  ('אוקראינה'), ('פורטוגל'), ('דנמרק'), ('רומניה'), ('פולין')
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'National Teams'
where t.name in ('קוסובו', 'ישראל', 'גאורגיה', 'הונגריה', 'צפון אירלנד',
                 'אוקראינה', 'פורטוגל', 'דנמרק', 'רומניה', 'פולין')
on conflict do nothing;

insert into team_api_ids (team_name, api_team_id, api_name) values
  ('קוסובו',       null, 'Kosovo'),
  ('ישראל',        null, 'Israel'),
  ('גאורגיה',      null, 'Georgia'),
  ('הונגריה',      null, 'Hungary'),
  ('צפון אירלנד',  null, 'Northern Ireland'),
  ('אוקראינה',     null, 'Ukraine'),
  ('פורטוגל',      null, 'Portugal'),
  ('דנמרק',        null, 'Denmark'),
  ('רומניה',       null, 'Romania'),
  ('פולין',        null, 'Poland')
on conflict (team_name) do nothing;

insert into rounds (season_id, round_number, deadline_at, status)
select s.id, 1, '2026-11-14T14:00:00Z'::timestamptz, 'open'
from seasons s
where s.name = 'עונה 2'
on conflict (season_id, round_number) do nothing;

insert into matches (round_id, home_team, away_team, kickoff_at)
select r.id, f.home_team, f.away_team, f.kickoff_at
from rounds r
join seasons s on s.id = r.season_id and s.name = 'עונה 2'
cross join (values
  ('קוסובו',      'ישראל',    '2026-11-14T14:00:00Z'::timestamptz),
  ('גאורגיה',     'הונגריה',  '2026-11-14T17:00:00Z'::timestamptz),
  ('צפון אירלנד', 'אוקראינה', '2026-11-14T19:45:00Z'::timestamptz),
  ('פורטוגל',     'דנמרק',    '2026-11-14T19:45:00Z'::timestamptz),
  ('רומניה',      'פולין',    '2026-11-14T19:45:00Z'::timestamptz)
) as f(home_team, away_team, kickoff_at)
where r.round_number = 1
  and not exists (select 1 from matches m where m.round_id = r.id);

-- 4) season_stats: current season only -----------------------------------------
create or replace view season_stats as
select
  u.id as user_id,
  u.full_name,
  count(rp.id) filter (
    where r.status <> 'open'
      and exists (
        select 1 from predictions p
        join matches m on m.id = p.match_id
        where m.round_id = rp.round_id and p.user_id = rp.user_id
      )
  ) as rounds_played,
  count(rp.id) filter (where rp.is_round_winner) as rounds_won,
  coalesce(sum(rp.total_points), 0) as total_points,
  coalesce(sum(rp.exact_score_count), 0) as season_hits,
  coalesce(sum(rp.correct_result_count), 0) as season_towards,
  round(
    avg(rp.total_points) filter (
      where r.status <> 'open'
        and exists (
          select 1 from predictions p
          join matches m on m.id = p.match_id
          where m.round_id = rp.round_id and p.user_id = rp.user_id
        )
    ),
    2
  ) as avg_points,
  u.avatar,
  coalesce(u.nickname, u.full_name) as display_name
from users u
left join (
  round_participation rp
  join rounds r on r.id = rp.round_id and r.season_id = current_season_id()
) on rp.user_id = u.id
where u.role = 'participant'
group by u.id, u.full_name, u.avatar, u.nickname;

alter view season_stats set (security_invoker = false);

commit;

-- Check (optional): should list round 1 (5 matches) and round 2 (11 matches)
-- of עונה 2.
-- select r.round_number, r.status, count(m.id)
-- from rounds r join seasons s on s.id = r.season_id and s.name = 'עונה 2'
-- left join matches m on m.round_id = r.id
-- group by r.round_number, r.status order by r.round_number;
