-- Adds "Champions League" and links it to whichever already-existing teams
-- are in this season's 36-team league phase, per the user-supplied list.
-- Deliberately does NOT create any new teams rows (PSG, Real Madrid,
-- Bayern, Man City, etc.) -- only the 6 of our existing 8 European clubs
-- that are actually on this season's list get linked. Brighton and Sevilla
-- are on our roster but not on this season's Champions League list, so
-- they're left with just their domestic league from
-- add-european-teams-and-leagues.sql.
--
-- team_leagues is many-to-many (see add-leagues.sql), so each of these 6
-- teams keeps its existing domestic-league row and simply gains a second
-- row for Champions League -- e.g. Barcelona is now in both La Liga and
-- Champions League.
--
-- Run once in the SQL editor.

insert into leagues (name) values ('Champions League')
  on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Champions League'
where t.name in (
  'ארסנל',       -- Arsenal
  'דורטמונד',    -- Dortmund
  'שטוטגרט',     -- Stuttgart
  'אינטר מילאן', -- Inter
  'רומא',        -- AS Roma
  'ברצלונה'      -- Barcelona
)
on conflict do nothing;
