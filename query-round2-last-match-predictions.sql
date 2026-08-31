-- Every participant's prediction for the last (latest-kickoff) match of round 2.
-- Run in Supabase SQL Editor (bypasses RLS there, so this returns everyone's
-- predictions regardless of the predictions_select_own_or_manager policy).

with last_match as (
  select m.*
  from matches m
  join rounds r on r.id = m.round_id
  where r.round_number = 2
  order by m.kickoff_at desc
  limit 1
)
select
  coalesce(u.nickname, u.full_name) as participant,
  lm.home_team,
  lm.away_team,
  p.pred_home_score,
  p.pred_away_score,
  lm.home_score as actual_home_score,
  lm.away_score as actual_away_score,
  p.points_earned,
  p.is_default,
  p.submitted_at
from last_match lm
join predictions p on p.match_id = lm.id
join users u on u.id = p.user_id
order by p.points_earned desc nulls last, participant;
