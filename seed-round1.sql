-- Seeds the real season, round 1, and its 7 matches into Supabase.
-- Run once in the SQL editor (running it twice creates a duplicate season —
-- it's not idempotent, matching schema.sql/rls.sql).

with new_season as (
  insert into seasons (name, start_date)
  values ('2026/27 Season', '2026-08-22')
  returning id
),
new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  select id, 1, '2026-08-22T20:00:00+03:00'::timestamptz, 'open'
  from new_season
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('Maccabi Petach-Tikva', 'Hapoel Kiryat Shmona', '2026-08-22T20:00:00+03:00'::timestamptz),
  ('Ironi Tiberias',       'Hapoel Petach-Tikva',   '2026-08-22T20:00:00+03:00'::timestamptz),
  ('Hapoel Jerusalem',     'Maccabi Tel-Aviv',      '2026-08-22T20:00:00+03:00'::timestamptz),
  ('Maccabi Haifa',        'Hapoel Ramat Gan',      '2026-08-22T20:00:00+03:00'::timestamptz),
  ('Hapoel Beer-Sheva',    'Hapoel Haifa',          '2026-08-22T20:00:00+03:00'::timestamptz),
  ('Maccabi Netanya',      'Bnei Sakhnin',          '2026-08-22T20:00:00+03:00'::timestamptz),
  ('Hapoel Tel Aviv',      'Beitar Jerusalem',      '2026-08-22T20:00:00+03:00'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
