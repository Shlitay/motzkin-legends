-- Translates team/club names and round 1's existing fixture text to Hebrew,
-- as part of converting the whole app to Hebrew + RTL. teams.name and
-- matches.home_team/away_team are free text (not foreign-keyed), so this is
-- a pure UPDATE of existing rows' text — it does not touch predictions or
-- round_participation (those reference match_id, never team name text), so
-- round 1's 6 real participants and their existing predictions are
-- unaffected. Run once in the SQL editor.
--
-- src/lib/mock-data.ts's TEAM_COLORS keys were renamed to match these exact
-- Hebrew strings in the same commit — both must be applied together, or the
-- team-color dots on /predictions will stop matching.

update teams set name = 'בית"ר ירושלים' where name = 'Beitar Jerusalem';
update teams set name = 'בני סכנין' where name = 'Bnei Sakhnin';
update teams set name = 'הפועל באר שבע' where name = 'Hapoel Beer-Sheva';
update teams set name = 'הפועל חיפה' where name = 'Hapoel Haifa';
update teams set name = 'הפועל קריית שמונה' where name = 'Hapoel Kiryat Shmona';
update teams set name = 'הפועל ירושלים' where name = 'Hapoel Jerusalem';
update teams set name = 'הפועל פתח תקווה' where name = 'Hapoel Petach-Tikva';
update teams set name = 'הפועל רמת גן' where name = 'Hapoel Ramat Gan';
update teams set name = 'הפועל תל אביב' where name = 'Hapoel Tel Aviv';
update teams set name = 'עירוני טבריה' where name = 'Ironi Tiberias';
update teams set name = 'מכבי חיפה' where name = 'Maccabi Haifa';
update teams set name = 'מכבי פתח תקווה' where name = 'Maccabi Petach-Tikva';
update teams set name = 'מכבי נתניה' where name = 'Maccabi Netanya';
update teams set name = 'מכבי תל אביב' where name = 'Maccabi Tel-Aviv';

update matches set home_team = 'מכבי פתח תקווה', away_team = 'הפועל קריית שמונה'
  where home_team = 'Maccabi Petach-Tikva' and away_team = 'Hapoel Kiryat Shmona';
update matches set home_team = 'עירוני טבריה', away_team = 'הפועל פתח תקווה'
  where home_team = 'Ironi Tiberias' and away_team = 'Hapoel Petach-Tikva';
update matches set home_team = 'הפועל ירושלים', away_team = 'מכבי תל אביב'
  where home_team = 'Hapoel Jerusalem' and away_team = 'Maccabi Tel-Aviv';
update matches set home_team = 'מכבי חיפה', away_team = 'הפועל רמת גן'
  where home_team = 'Maccabi Haifa' and away_team = 'Hapoel Ramat Gan';
update matches set home_team = 'הפועל באר שבע', away_team = 'הפועל חיפה'
  where home_team = 'Hapoel Beer-Sheva' and away_team = 'Hapoel Haifa';
update matches set home_team = 'מכבי נתניה', away_team = 'בני סכנין'
  where home_team = 'Maccabi Netanya' and away_team = 'Bnei Sakhnin';
update matches set home_team = 'הפועל תל אביב', away_team = 'בית"ר ירושלים'
  where home_team = 'Hapoel Tel Aviv' and away_team = 'Beitar Jerusalem';
