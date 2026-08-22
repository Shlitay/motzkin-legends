-- Extends submit_match_result() (see add-submit-match-result-function.sql)
-- with a 4th parameter, p_is_final, and makes the round's own status
-- follow its matches: 'finished' once every match in the round is final,
-- reverting to 'locked' if a final gets unchecked again (fixing a
-- mistake). Also switches to the new shared recompute_round_standings()
-- helper instead of inlining the same aggregate/rank SQL.
--
-- The argument list changed (3 ints -> 3 ints + a bool), so
-- create or replace won't replace the old function — it has a different
-- signature and Postgres would just add a second overload, leaving the
-- stale 3-arg version callable. Drop it explicitly first. Run once in the
-- SQL editor, after add-match-is-final.sql and
-- add-recompute-round-standings-function.sql.

drop function if exists submit_match_result(uuid, int, int);

create or replace function submit_match_result(
  p_match_id uuid,
  p_home_score int,
  p_away_score int,
  p_is_final boolean
)
returns void
language plpgsql
security definer
as $$
declare
  v_round_id uuid;
  v_exact_pts int;
  v_correct_pts int;
begin
  if not is_manager() then
    raise exception 'only the manager can submit match results';
  end if;

  update matches set home_score = p_home_score, away_score = p_away_score, is_final = p_is_final
  where id = p_match_id
  returning round_id into v_round_id;

  select exact_score_points, correct_result_points into v_exact_pts, v_correct_pts
  from scoring_rules order by effective_from desc limit 1;

  -- Exact score beats correct-direction; sign() comparison naturally
  -- covers predicted-draw-vs-actual-draw too (sign(0) = sign(0)).
  update predictions p
  set points_earned = case
    when p.pred_home_score = p_home_score and p.pred_away_score = p_away_score then v_exact_pts
    when sign(p.pred_home_score - p.pred_away_score) = sign(p_home_score - p_away_score) then v_correct_pts
    else 0
  end
  where p.match_id = p_match_id;

  perform recompute_round_standings(v_round_id);

  -- Round completion follows the matches, not the other way around:
  -- 'finished' once every match in the round is marked final, reverted
  -- back to 'locked' if a final gets unchecked (correcting a mistake).
  if not exists (select 1 from matches where round_id = v_round_id and not is_final) then
    update rounds set status = 'finished' where id = v_round_id;
  else
    update rounds set status = 'locked' where id = v_round_id and status = 'finished';
  end if;
end;
$$;

grant execute on function submit_match_result(uuid, int, int, boolean) to authenticated;
