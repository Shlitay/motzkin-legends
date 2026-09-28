-- Adds the 8 European clubs (introduced 2026-09-16 for round 5's 10-match
-- rounds -- see TEAM_LOGOS in src/lib/constants.ts) to the `teams` table.
-- They were only ever free text in matches.home_team/away_team and
-- TEAM_LOGOS, never rows in `teams`, so add-leagues.sql's team_leagues
-- linking had nothing to attach them to. Names match TEAM_LOGOS's Hebrew
-- keys exactly.
--
-- Then adds each club's real domestic league and links every team to it,
-- so every team in the app (the 14 Israeli clubs from add-leagues.sql plus
-- these 8) now has a league attached.
--
-- Run once in the SQL editor.

insert into teams (name, primary_color, secondary_color) values
  ('ארסנל', '#ef0107', '#ffffff'),
  ('ברייטון', '#0057b8', '#ffffff'),
  ('דורטמונד', '#fde100', '#000000'),
  ('שטוטגרט', '#e32219', '#ffffff'),
  ('אינטר מילאן', '#0068a8', '#000000'),
  ('רומא', '#8e1f2f', '#f0bc42'),
  ('ברצלונה', '#a50044', '#004d98'),
  ('סביליה', '#ffffff', '#d91a21')
on conflict (name) do nothing;

insert into leagues (name) values
  ('Premier League'),
  ('Bundesliga'),
  ('Serie A'),
  ('La Liga')
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Premier League'
where t.name in ('ארסנל', 'ברייטון')
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Bundesliga'
where t.name in ('דורטמונד', 'שטוטגרט')
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Serie A'
where t.name in ('אינטר מילאן', 'רומא')
on conflict do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'La Liga'
where t.name in ('ברצלונה', 'סביליה')
on conflict do nothing;
