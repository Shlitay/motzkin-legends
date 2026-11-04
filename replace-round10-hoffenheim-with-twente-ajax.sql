-- Round 10 is already live (migration 62). Swaps Hoffenheim-Schalke 04
-- (Sun 8.11, 20:30 IST) for Twente-Ajax (Sun 8.11, 15:30 IST = 13:30 UTC).
-- Source: user-provided screenshot, 2026-11-04.
--
-- Updates the existing match row in place, so it keeps its id and any
-- main-event flag. Predictions already made on the old fixture are deleted
-- first, because they would otherwise silently count for the new one.
-- Other matches' predictions are untouched.
--
-- Two new teams and a new Eredivisie league. Hoffenheim and Schalke stay in
-- `teams`, unused for now. Runs as one transaction; a second run changes
-- nothing, since the old fixture no longer matches.

begin;

insert into leagues (name) values ('Eredivisie')
on conflict (name) do nothing;

insert into teams (name) values
  ('טוונטה'),  -- Twente
  ('אייאקס')   -- Ajax
on conflict (name) do nothing;

insert into team_leagues (team_id, league_id)
select t.id, l.id from teams t join leagues l on l.name = 'Eredivisie'
where t.name in ('טוונטה', 'אייאקס')
on conflict do nothing;

delete from predictions
where match_id in (
  select m.id from matches m join rounds r on r.id = m.round_id
  where r.round_number = 10
    and m.home_team = 'הופנהיים' and m.away_team = 'שאלקה 04'
);

update matches m
set home_team = 'טוונטה',
    away_team = 'אייאקס',
    kickoff_at = '2026-11-08T13:30:00Z'::timestamptz
from rounds r
where r.id = m.round_id
  and r.round_number = 10
  and m.home_team = 'הופנהיים' and m.away_team = 'שאלקה 04';

commit;

-- Shows the result: 11 rows, with Twente-Ajax and no Hoffenheim-Schalke.
select m.home_team, m.away_team, m.kickoff_at
from matches m join rounds r on r.id = m.round_id
where r.round_number = 10
order by m.kickoff_at;
