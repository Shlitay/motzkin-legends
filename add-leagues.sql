-- Adds a leagues concept and links teams to leagues. A team can belong to
-- more than one league (e.g. Real Madrid: La Liga + Champions League), so
-- this is a many-to-many join table rather than a single league_id column
-- on teams.
--
-- Populates "Israeli Premier League" and links every team currently in the
-- teams table to it -- all 14 existing teams are Israeli premier league
-- clubs, so this covers "the Israeli teams" without depending on whether
-- teams.name is in English or Hebrew (it's Hebrew live, see
-- add-hebrew-team-names.sql).
--
-- Run once in the SQL editor.

create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table team_leagues (
  team_id uuid references teams(id) not null,
  league_id uuid references leagues(id) not null,
  primary key (team_id, league_id)
);

alter table leagues enable row level security;
alter table team_leagues enable row level security;

create policy "leagues_select_all" on leagues for select to authenticated using (true);
create policy "leagues_manager_write" on leagues for all to authenticated
  using (is_manager()) with check (is_manager());

create policy "team_leagues_select_all" on team_leagues for select to authenticated using (true);
create policy "team_leagues_manager_write" on team_leagues for all to authenticated
  using (is_manager()) with check (is_manager());

insert into leagues (name) values ('Israeli Premier League')
  on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id
from teams t
cross join leagues l
where l.name = 'Israeli Premier League'
on conflict do nothing;
