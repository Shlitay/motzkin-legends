-- Seeds round 8's 7 matches into the existing 2026/27 season -- 5
-- Israeli Premier League fixtures mixed with 2 European ones (Chelsea-
-- Tottenham, Premier League; Napoli-Roma, Serie A). All play Saturday
-- 24.10.2026. Run once in the SQL editor (not idempotent, matching
-- every prior seed-roundN.sql). Creating round 8 as 'open' cuts every
-- page over to it automatically -- rounds 1-7 stay browsable read-only.
--
-- Source: user-provided screenshots, checked 2026-10-20. Kickoffs
-- (18:45/19:00/19:30) treated as already Israel-local, same reasoning
-- as every prior European match this project has seeded -- this is
-- also the LAST round before Israel's, the UK's, and Italy's DST all
-- end on 25.10.2026, so it's the last time this +1h/+2h assumption
-- holds without needing a different offset. Converted to UTC (-3h) for
-- storage.
--
-- Napoli and Roma already exist with crests (added for round 6's
-- Champions League round). Chelsea and Tottenham are brand new --
-- added names-only below, linked to Premier League, no crests yet.
--
-- season_id is hardcoded directly, not looked up by name, per the
-- seed-round6.sql lesson (seasons.name has a pre-existing typo,
-- '2026/27 Seasor', still unfixed). predictions_open_at intentionally
-- left unset, per migration 34. deadline_at is the first match's
-- kickoff (Hapoel Jerusalem-Hapoel Tel Aviv / Kiryat Shmona-Bnei
-- Sakhnin, both 18:45 Israel time = 15:45 UTC).

insert into teams (name) values
  ('צ׳לסי'),    -- Chelsea
  ('טוטנהאם')   -- Tottenham
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Premier League'
where t.name in ('צ׳לסי', 'טוטנהאם')
on conflict do nothing;

with new_round as (
  insert into rounds (season_id, round_number, deadline_at, status)
  values ('eca4b656-e9d8-497c-9a0e-eb20ad165ef1', 8, '2026-10-24T15:45:00Z'::timestamptz, 'open')
  returning id
)
insert into matches (round_id, home_team, away_team, kickoff_at)
select new_round.id, fixtures.home_team, fixtures.away_team, fixtures.kickoff_at
from new_round,
(values
  ('הפועל ירושלים',      'הפועל תל אביב',      '2026-10-24T15:45:00Z'::timestamptz),
  ('הפועל קריית שמונה',  'בני סכנין',           '2026-10-24T15:45:00Z'::timestamptz),
  ('עירוני טבריה',       'מכבי נתניה',          '2026-10-24T16:00:00Z'::timestamptz),
  ('הפועל רמת גן',       'מכבי פתח תקווה',      '2026-10-24T16:00:00Z'::timestamptz),
  ('נאפולי',             'רומא',                '2026-10-24T16:00:00Z'::timestamptz),
  ('צ׳לסי',              'טוטנהאם',             '2026-10-24T16:30:00Z'::timestamptz),
  ('מכבי תל אביב',       'הפועל חיפה',          '2026-10-24T16:30:00Z'::timestamptz)
) as fixtures(home_team, away_team, kickoff_at);
