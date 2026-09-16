-- Restructures scoring_rules from a flat exact/correct/bonus model into 3
-- independent outcome categories the user asked for directly, each with
-- its own points (supersedes add-goal-difference-bonus-points.sql —
-- run this instead, whether or not that one was applied):
--
--   ניצחון בית/חוץ (home/away win) — actual result is a win for either
--     side. towards = correct winner, WRONG goal difference (e.g. predict
--     2-0, actual 4-0). hit = exact score (predict 2-0, actual 2-0).
--   הפרש שערים זהה (same goal difference) — actual result is a win,
--     predicted the correct winner AND the exact goal difference, but not
--     the exact score (predict 2-0, actual 3-1: both +2). Only a
--     "towards" value — an exact score match always already has a
--     matching difference too, so that combination is scored by the win
--     category's own "hit" above, not a second "hit" here (confirmed with
--     the user rather than guessing, since the two cases are impossible
--     to distinguish once the score is actually exact).
--   תיקו (draw) — actual result is a draw. towards = predicted a draw,
--     wrong exact score (predict 1-1, actual 2-2). hit = exact draw score.
--
-- compute_prediction_points() drops the old 7-arg signature (exact/
-- correct/bonus) for this new one — explicit drop first since changing
-- the argument list doesn't let create-or-replace replace it in place.
--
-- Run once in the Supabase SQL editor.

alter table scoring_rules
  add column if not exists win_hit_points int not null default 10,
  add column if not exists win_towards_points int not null default 5,
  add column if not exists same_diff_towards_points int not null default 6,
  add column if not exists draw_hit_points int not null default 10,
  add column if not exists draw_towards_points int not null default 6;

alter table scoring_rules
  drop column if exists exact_score_points,
  drop column if exists correct_result_points,
  drop column if exists goal_diff_bonus_points;

drop function if exists compute_prediction_points(int, int, int, int, int, int, int);

create or replace function compute_prediction_points(
  p_pred_home int,
  p_pred_away int,
  p_actual_home int,
  p_actual_away int,
  p_win_hit_pts int,
  p_win_towards_pts int,
  p_same_diff_towards_pts int,
  p_draw_hit_pts int,
  p_draw_towards_pts int
)
returns int
language sql
immutable
as $$
  select case
    -- Actual result is a draw.
    when p_actual_home = p_actual_away then
      case
        when p_pred_home <> p_pred_away then 0
        when p_pred_home = p_actual_home then p_draw_hit_pts
        else p_draw_towards_pts
      end
    -- Actual result is a win for either side.
    else
      case
        when p_pred_home = p_actual_home and p_pred_away = p_actual_away then p_win_hit_pts
        when sign(p_pred_home - p_pred_away) <> sign(p_actual_home - p_actual_away) then 0
        when (p_pred_home - p_pred_away) = (p_actual_home - p_actual_away) then p_same_diff_towards_pts
        else p_win_towards_pts
      end
  end;
$$;

grant execute on function compute_prediction_points(int, int, int, int, int, int, int, int, int) to authenticated;

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
  v_win_hit int;
  v_win_towards int;
  v_same_diff_towards int;
  v_draw_hit int;
  v_draw_towards int;
begin
  if not is_manager() then
    raise exception 'only the manager can submit match results';
  end if;

  update matches set home_score = p_home_score, away_score = p_away_score, is_final = p_is_final
  where id = p_match_id
  returning round_id into v_round_id;

  select win_hit_points, win_towards_points, same_diff_towards_points, draw_hit_points, draw_towards_points
  into v_win_hit, v_win_towards, v_same_diff_towards, v_draw_hit, v_draw_towards
  from scoring_rules order by effective_from desc limit 1;

  update predictions p
  set points_earned = compute_prediction_points(
    p.pred_home_score, p.pred_away_score, p_home_score, p_away_score,
    v_win_hit, v_win_towards, v_same_diff_towards, v_draw_hit, v_draw_towards
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
  v_win_hit int;
  v_win_towards int;
  v_same_diff_towards int;
  v_draw_hit int;
  v_draw_towards int;
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

    select win_hit_points, win_towards_points, same_diff_towards_points, draw_hit_points, draw_towards_points
    into v_win_hit, v_win_towards, v_same_diff_towards, v_draw_hit, v_draw_towards
    from scoring_rules order by effective_from desc limit 1;

    update predictions p
    set points_earned = compute_prediction_points(
      p.pred_home_score, p.pred_away_score, m.home_score, m.away_score,
      v_win_hit, v_win_towards, v_same_diff_towards, v_draw_hit, v_draw_towards
    )
    from matches m
    where p.match_id = m.id and m.round_id = r.id;

    perform recompute_round_standings(r.id);
  end loop;
end;
$$;
