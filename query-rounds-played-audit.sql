-- Full audit: every approved participation row, with the round's actual
-- status, for every participant. Use this to check whether rounds_played
-- is now correctly excluding round 3 (still 'open') or if something else
-- is going on.
select
  coalesce(u.nickname, u.full_name) as participant,
  r.round_number,
  r.status as round_status,
  rp.payment_status
from round_participation rp
join users u on u.id = rp.user_id
join rounds r on r.id = rp.round_id
order by participant, r.round_number;

-- What the view itself currently returns, for comparison.
select display_name, rounds_played, total_points
from season_stats
order by rounds_played desc, total_points desc;

-- Sanity check: does the view definition in the database actually contain
-- the "status <> 'open'" fix, or did the CREATE OR REPLACE not take?
select pg_get_viewdef('season_stats'::regclass, true);
