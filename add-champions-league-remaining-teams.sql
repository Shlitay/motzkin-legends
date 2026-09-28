-- Adds the remaining 30 Champions League clubs from the user-supplied
-- 36-team league-phase screenshot -- add-champions-league.sql only linked
-- the 6 that already existed in `teams` (Arsenal, Dortmund, Stuttgart,
-- Inter Milan, Roma, Barcelona). Names only, per request -- no colors, no
-- crests; these teams don't appear in any match yet.
--
-- Hebrew names, matching every existing team row's convention. A few less
-- common clubs (LASK, Sabah, Bodo/Glimt, Slovan Bratislava) don't have one
-- single standardized Hebrew transliteration -- flag any that look wrong,
-- it's a one-line rename.
--
-- Run once in the SQL editor.

insert into teams (name) values
  ('פריז סן ז׳רמן'),      -- PSG
  ('באיירן מינכן'),        -- Bayern
  ('מנצ׳סטר יונייטד'),     -- Man Utd
  ('קומו'),                -- Como
  ('ספורטינג'),            -- Sporting
  ('מנצ׳סטר סיטי'),        -- Man City
  ('אסטון וילה'),          -- Aston Villa
  ('לאנס'),                -- Lens
  ('בטיס'),                -- Betis
  ('ליברפול'),             -- Liverpool
  ('ריאל מדריד'),          -- Real Madrid
  ('איאק אתונה'),          -- AEK
  ('שחטאר דונייצק'),       -- Shakhtar
  ('פנרבחצ׳ה'),            -- Fenerbahce
  ('PSV איינדהובן'),       -- PSV
  ('ויאריאל'),             -- Villarreal
  ('קלאב בריז׳'),          -- Club Brugge
  ('ליל'),                 -- Lille
  ('סלאביה פראג'),         -- Slavia Praha
  ('אתלטיקו מדריד'),       -- Atl. Madrid
  ('לאסק לינץ'),           -- LASK
  ('נאפולי'),              -- Napoli
  ('גלטסראיי'),            -- Galatasaray
  ('ויקינג'),              -- Viking
  ('פורטו'),               -- Porto
  ('לייפציג'),             -- RB Leipzig
  ('פיינורד'),             -- Feyenoord
  ('סבאח'),                -- Sabah
  ('סלובאן ברטיסלבה'),     -- Slovan Bratislava
  ('בודו/גלימט')           -- Bodo/Glimt
on conflict (name) do nothing;

-- Link every team on the 36-team list (new 30 + the 6 already linked in
-- add-champions-league.sql, safely re-selected here too) to Champions
-- League. on conflict do nothing makes this safe to run regardless of
-- whether the earlier migration already linked the first 6.
insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Champions League'
where t.name in (
  'ארסנל', 'דורטמונד', 'שטוטגרט', 'אינטר מילאן', 'רומא', 'ברצלונה',
  'פריז סן ז׳רמן', 'באיירן מינכן', 'מנצ׳סטר יונייטד', 'קומו', 'ספורטינג',
  'מנצ׳סטר סיטי', 'אסטון וילה', 'לאנס', 'בטיס', 'ליברפול', 'ריאל מדריד',
  'איאק אתונה', 'שחטאר דונייצק', 'פנרבחצ׳ה', 'PSV איינדהובן', 'ויאריאל',
  'קלאב בריז׳', 'ליל', 'סלאביה פראג', 'אתלטיקו מדריד', 'לאסק לינץ',
  'נאפולי', 'גלטסראיי', 'ויקינג', 'פורטו', 'לייפציג', 'פיינורד', 'סבאח',
  'סלובאן ברטיסלבה', 'בודו/גלימט'
)
on conflict do nothing;
