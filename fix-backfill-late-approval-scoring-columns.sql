-- Fixes a real bug: backfill_late_approval() was missed when
-- restructure-scoring-into-win-samediff-draw.sql (migration 39) dropped
-- scoring_rules.exact_score_points/correct_result_points in favor of the
-- 5-column win/same-diff/draw model. submit_match_result() and
-- lock_expired_rounds() were both updated at the time; this third,
-- independent copy of the same scoring formula (added separately in
-- add-backfill-late-approval-function.sql, migration 23) was not, so it
-- started raising "column scoring_rules.exact_score_points does not
-- exist" the moment a new round-5 participant got approved (this
-- function runs on every approval, not just late ones).
--
-- Same fix as migrations 38/39: use the shared compute_prediction_points()
-- helper instead of a fourth copy-pasted case expression.
--
-- Run once in the Supabase SQL editor.

create or replace function backfill_late_approval(p_round_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_win_hit int;
  v_win_towards int;
  v_same_diff_bonus int;
  v_draw_hit int;
  v_draw_towards int;
begin
  if not is_manager() then
    raise exception 'only the manager can backfill predictions';
  end if;

  select win_hit_points, win_towards_points, same_diff_bonus_points, draw_hit_points, draw_towards_points
  into v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
  from scoring_rules order by effective_from desc limit 1;

  insert into predictions (user_id, match_id, pred_home_score, pred_away_score, is_default)
  select p_user_id, m.id, u.default_home_score, u.default_away_score, true
  from matches m
  join users u on u.id = p_user_id
  where m.round_id = p_round_id
    and m.kickoff_at <= now()
    and u.default_home_score is not null
    and u.default_away_score is not null
    and not exists (
      select 1 from predictions p where p.user_id = p_user_id and p.match_id = m.id
    );

  update predictions p
  set points_earned = compute_prediction_points(
    p.pred_home_score, p.pred_away_score, m.home_score, m.away_score,
    v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
  )
  from matches m
  where p.match_id = m.id and p.user_id = p_user_id and m.round_id = p_round_id
    and m.home_score is not null;

  perform recompute_round_standings(p_round_id);
end;
$$;
