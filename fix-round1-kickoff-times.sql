-- Corrects round 1's kickoff_at: it was seeded with one fake time (22.8
-- 20:00) for all 7 matches. Real fixtures are staggered across 22.8-3.9.
-- Source: 365scores.com Israeli Premier League, checked 2026-08-23.
-- Home/away team order is untouched (already correct) and RLS-permitted
-- only to the manager, so this must be run manually in the SQL editor.
--
-- The 3 already-finished matches (Maccabi Petah Tikva-Kiryat Shmona,
-- Ironi Tiberias-Hapoel Petah Tikva, Maccabi Haifa-Hapoel Ramat Gan) keep
-- their existing kickoff_at: 365scores doesn't publish an exact kickoff
-- time for already-played matches, and is_final already makes kickoff_at
-- irrelevant to the match-status badge (see matchStatus() in
-- src/app/predictions/page.tsx).

update matches set kickoff_at = '2026-08-23T17:15:00+03:00'
  where home_team = 'הפועל ירושלים' and away_team = 'מכבי תל אביב';

update matches set kickoff_at = '2026-08-24T17:00:00+03:00'
  where home_team = 'מכבי נתניה' and away_team = 'בני סכנין';

update matches set kickoff_at = '2026-09-02T17:00:00+03:00'
  where home_team = 'הפועל באר שבע' and away_team = 'הפועל חיפה';

update matches set kickoff_at = '2026-09-03T17:30:00+03:00'
  where home_team = 'הפועל תל אביב' and away_team = 'בית"ר ירושלים';
