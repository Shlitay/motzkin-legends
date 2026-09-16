-- New scoring tier, requested directly by the user: a correct-direction
-- prediction (not exact) that also gets the goal DIFFERENCE exactly right
-- earns a bonus on top of the normal correct-direction points.
--
-- Examples given:
--   predict 2-0, actual 3-1 -> both home wins by 2 -> correct_result_points
--     + goal_diff_bonus_points (5 + 1 = 6 with defaults)
--   predict 2-0, actual 4-0 -> both home wins, but by 2 vs 4 -> just
--     correct_result_points (5)
--   predict a draw (not exact), actual a draw -> ANY two draws share the
--     same difference (0), so this tier already covers "draw hit" without
--     special-casing it. Exact-score draws are untouched (still
--     exact_score_points, 10 by default).
--
-- Extracts the shared scoring formula (previously copy-pasted identically
-- into submit_match_result() and lock_expired_rounds()) into one plain SQL
-- function so the two can't drift out of sync again.
--
-- Run once in the Supabase SQL editor, after
-- update-submit-match-result-final-flag.sql and
-- update-lock-expired-rounds-seed-scores.sql (this replaces both bodies).

alter table scoring_rules add column goal_diff_bonus_points int not null default 1;

create or replace function compute_prediction_points(
  p_pred_home int,
  p_pred_away int,
  p_actual_home int,
  p_actual_away int,
  p_exact_pts int,
  p_correct_pts int,
  p_bonus_pts int
)
returns int
language sql
immutable
as $$
  select case
    when p_pred_home = p_actual_home and p_pred_away = p_actual_away then p_exact_pts
    when sign(p_pred_home - p_pred_away) = sign(p_actual_home - p_actual_away) then
      p_correct_pts + case
        when (p_pred_home - p_pred_away) = (p_actual_home - p_actual_away) then p_bonus_pts
        else 0
      end
    else 0
  end;
$$;

grant execute on function compute_prediction_points(int, int, int, int, int, int, int) to authenticated;

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
  v_bonus_pts int;
begin
  if not is_manager() then
    raise exception 'only the manager can submit match results';
  end if;

  update matches set home_score = p_home_score, away_score = p_away_score, is_final = p_is_final
  where id = p_match_id
  returning round_id into v_round_id;

  select exact_score_points, correct_result_points, goal_diff_bonus_points
  into v_exact_pts, v_correct_pts, v_bonus_pts
  from scoring_rules order by effective_from desc limit 1;

  update predictions p
  set points_earned = compute_prediction_points(
    p.pred_home_score, p.pred_away_score, p_home_score, p_away_score,
    v_exact_pts, v_correct_pts, v_bonus_pts
  )
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

create or replace function lock_expired_rounds()
returns void
language plpgsql
security definer
as $$
declare
  r record;
  v_exact_pts int;
  v_correct_pts int;
  v_bonus_pts int;
begin
  for r in
    select id from rounds where status = 'open' and deadline_at <= now()
  loop
    update rounds set status = 'locked' where id = r.id;

    -- Fill in the default score for any approved participant's matches
    -- they didn't predict — per match, not per round: someone who predicted
    -- 4 of 7 matches only gets the other 3 auto-filled.
    insert into predictions (user_id, match_id, pred_home_score, pred_away_score, is_default)
    select rp.user_id, m.id, u.default_home_score, u.default_away_score, true
    from round_participation rp
    join matches m on m.round_id = r.id
    join users u on u.id = rp.user_id
    where rp.round_id = r.id
      and rp.payment_status = 'approved'
      and u.default_home_score is not null
      and u.default_away_score is not null
      and not exists (
        select 1 from predictions p where p.user_id = rp.user_id and p.match_id = m.id
      );

    -- Kickoff baseline: only matches still unscored, so a result the
    -- manager may have already entered before lock is never clobbered.
    update matches set home_score = 0, away_score = 0, is_final = false
    where round_id = r.id and home_score is null;

    select exact_score_points, correct_result_points, goal_diff_bonus_points
    into v_exact_pts, v_correct_pts, v_bonus_pts
    from scoring_rules order by effective_from desc limit 1;

    update predictions p
    set points_earned = compute_prediction_points(
      p.pred_home_score, p.pred_away_score, m.home_score, m.away_score,
      v_exact_pts, v_correct_pts, v_bonus_pts
    )
    from matches m
    where p.match_id = m.id and m.round_id = r.id;

    perform recompute_round_standings(r.id);
  end loop;
end;
$$;
