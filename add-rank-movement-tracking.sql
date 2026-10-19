-- Adds round_participation.previous_rank, snapshotting whatever `rank`
-- was immediately before each recompute_round_standings() call -- lets
-- /leaderboard show a green/red arrow on the top-3 avatars when a goal
-- (or any other recompute-triggering event) just changed their
-- standing, without needing a live subscription: the comparison is
-- stored server-side at recompute time, not just across two client-side
-- fetches, so it works correctly even for someone who just opened the
-- page for the first time after the change happened.
--
-- Based on the LATEST definition of recompute_round_standings() (see
-- fix-standings-count-only-started-matches.sql, confirmed via grep
-- across every *.sql file before writing this -- per this project's own
-- documented redefinition pitfall). Only the 2nd of its two `update`
-- statements changes: `set previous_rank = rp.rank, rank = ranked.rnk`
-- evaluates the SET clause's old-row value for `rp.rank` before this
-- same statement overwrites it, so previous_rank always ends up holding
-- the pre-this-call rank, correctly landing on "no change" (equal to
-- the new rank) when a recompute happens to not move anyone.
--
-- Run once in the SQL editor.

alter table round_participation add column if not exists previous_rank int;

create or replace function recompute_round_standings(p_round_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update round_participation rp
  set total_points = coalesce(agg.total_points, 0),
      exact_score_count = coalesce(agg.exact_count, 0),
      correct_result_count = coalesce(agg.correct_count, 0)
  from round_participation rp0
  left join (
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
      and (m.is_final or m.kickoff_at <= now())
    group by p.user_id
  ) agg on agg.user_id = rp0.user_id
  where rp.id = rp0.id and rp.round_id = p_round_id;

  update round_participation rp
  set previous_rank = rp.rank,
      rank = ranked.rnk
  from (
    select rp2.id,
      rank() over (
        order by
          rp2.total_points desc,
          rp2.exact_score_count desc,
          coalesce(main_event_pred.points_earned, 0) desc
      ) as rnk
    from round_participation rp2
    left join matches me
      on me.round_id = p_round_id and me.is_main_event
      and (me.is_final or me.kickoff_at <= now())
    left join predictions main_event_pred
      on main_event_pred.user_id = rp2.user_id and main_event_pred.match_id = me.id
    where rp2.round_id = p_round_id
  ) ranked
  where rp.id = ranked.id;
end;
$$;

grant execute on function recompute_round_standings(uuid) to authenticated;
