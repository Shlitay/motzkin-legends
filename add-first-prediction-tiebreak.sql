-- Adds a third round-standings tiebreaker: whoever submitted their
-- predictions first, after points and exact-hit count. "First" means the
-- EARLIEST submitted_at across a participant's predictions for the round
-- — and updates don't count, because sendPrediction() in
-- src/app/predictions/page.tsx only ever upserts {user_id, match_id,
-- pred_home_score, pred_away_score} (no submitted_at in the payload), so
-- PostgREST's upsert leaves submitted_at untouched on conflict — it's
-- already, by construction, "when this row was first created," never
-- bumped by a later edit. No schema/app change needed for that part; this
-- migration only changes the ORDER BY in recompute_round_standings().
--
-- Participants who never predicted anything themselves (every one of
-- their rows is the lock_expired_rounds() default-fill, which runs after
-- the deadline) still get a submitted_at — just a late one — so they
-- correctly lose this tiebreak to anyone who predicted before the
-- deadline, without needing a special case.
--
-- create or replace, same signature, safe to run against the existing
-- function. Run once in the SQL editor.

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
    select rp2.id,
      rank() over (
        order by
          rp2.total_points desc,
          rp2.exact_score_count desc,
          coalesce(first_pred.first_submitted_at, 'infinity'::timestamptz) asc
      ) as rnk
    from round_participation rp2
    left join (
      select p.user_id, min(p.submitted_at) as first_submitted_at
      from predictions p
      join matches m on m.id = p.match_id
      where m.round_id = p_round_id
      group by p.user_id
    ) first_pred on first_pred.user_id = rp2.user_id
    where rp2.round_id = p_round_id
  ) ranked
  where rp.id = ranked.id;
end;
$$;

grant execute on function recompute_round_standings(uuid) to authenticated;
