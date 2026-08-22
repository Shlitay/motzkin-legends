-- Shared helper extracted from submit_match_result()'s original aggregate/
-- rank recompute, so both submit_match_result() and lock_expired_rounds()
-- (which needs to compute standings from the 0-0 kickoff baseline, not
-- just manager-entered results) can call the same logic instead of
-- duplicating it. Pure addition — new function only. Run once in the SQL
-- editor, before update-lock-expired-rounds-seed-scores.sql and
-- update-submit-match-result-final-flag.sql, both of which call it.
--
-- security definer, no is_manager() gate — it only reads
-- predictions.points_earned (already correctly computed by whichever
-- caller invoked it) and writes round_participation, same trust boundary
-- as today.

create or replace function recompute_round_standings(p_round_id uuid)
returns void
language plpgsql
security definer
as $$
begin
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
    where m.round_id = p_round_id
    group by p.user_id
  ) agg
  where rp.round_id = p_round_id and rp.user_id = agg.user_id;

  update round_participation rp
  set rank = ranked.rnk
  from (
    select id, rank() over (order by total_points desc, exact_score_count desc) as rnk
    from round_participation where round_id = p_round_id
  ) ranked
  where rp.id = ranked.id;
end;
$$;

grant execute on function recompute_round_standings(uuid) to authenticated;
