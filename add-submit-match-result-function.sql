-- Manager result-entry + scoring engine: one function that records a
-- match's final score and recomputes every affected participant's points,
-- hit/towards counts, and rank for the round. Called from /manager's new
-- "תוצאות מחזור" screen, once per match saved.
--
-- security definer + the is_manager() check inside is required the same
-- way lock_expired_rounds() needed it: an ordinary manager-authenticated
-- session can't otherwise write predictions.points_earned for other
-- users' rows (predictions_update_own restricts that to user_id =
-- auth.uid()) or round_participation aggregates for everyone in the round.
--
-- Pure addition — new function only, doesn't alter any table. Run once in
-- the SQL editor.

create or replace function submit_match_result(p_match_id uuid, p_home_score int, p_away_score int)
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

  update matches set home_score = p_home_score, away_score = p_away_score
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

  -- Full recompute for the whole round (cheap at this scale — 7 matches,
  -- a handful of participants), not incremental, so results stay
  -- self-consistent no matter what order matches get scored in.
  update round_participation rp
  set total_points = agg.total_points,
      exact_score_count = agg.exact_count,
      correct_result_count = agg.correct_count
  from (
    select p.user_id,
      coalesce(sum(p.points_earned), 0) as total_points,
      count(*) filter (
        where p.pred_home_score = m.home_score and p.pred_away_score = m.away_score
      ) as exact_count,
      count(*) filter (
        where m.home_score is not null
          and not (p.pred_home_score = m.home_score and p.pred_away_score = m.away_score)
          and sign(p.pred_home_score - p.pred_away_score) = sign(m.home_score - m.away_score)
      ) as correct_count
    from predictions p
    join matches m on m.id = p.match_id
    where m.round_id = v_round_id
    group by p.user_id
  ) agg
  where rp.round_id = v_round_id and rp.user_id = agg.user_id;

  -- Rank: points desc, exact-score count desc (tiebreak — see schema.sql's
  -- documented ranking note). Not scoped to payment_status, matching
  -- leaderboard/page.tsx's existing unfiltered round_participation query.
  update round_participation rp
  set rank = ranked.rnk
  from (
    select id, rank() over (order by total_points desc, exact_score_count desc) as rnk
    from round_participation where round_id = v_round_id
  ) ranked
  where rp.id = ranked.id;
end;
$$;

grant execute on function submit_match_result(uuid, int, int) to authenticated;
