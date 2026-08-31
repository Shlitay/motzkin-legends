-- 1) This specific participant's predictions for the current (latest) round.
-- Swap the nickname filter for whoever you're checking.
with target_user as (
  select id, coalesce(nickname, full_name) as name
  from users
  where nickname ilike '%אור גולדברג%' or full_name ilike '%אור גולדברג%'
),
current_round as (
  select * from rounds order by round_number desc limit 1
)
select
  tu.name as participant,
  m.home_team,
  m.away_team,
  p.pred_home_score,
  p.pred_away_score,
  p.is_default,
  p.submitted_at
from target_user tu
cross join current_round r
join matches m on m.round_id = r.id
left join predictions p on p.match_id = m.id and p.user_id = tu.id
order by m.kickoff_at;

-- 2) Broader check: does ANY approved participant have predictions for the
-- current round, or is this a round-wide gap (e.g. default-fill never ran)?
with current_round as (
  select * from rounds order by round_number desc limit 1
)
select
  coalesce(u.nickname, u.full_name) as participant,
  count(m.id) as matches_in_round,
  count(p.id) as predictions_found
from current_round r
join round_participation rp on rp.round_id = r.id and rp.payment_status = 'approved'
join users u on u.id = rp.user_id
join matches m on m.round_id = r.id
left join predictions p on p.match_id = m.id and p.user_id = rp.user_id
group by u.id, u.nickname, u.full_name
order by predictions_found;
