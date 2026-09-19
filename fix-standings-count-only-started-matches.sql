-- Fixes a regression: since round 5 started, the round table counted
-- matches that hadn't kicked off yet. Only live and ended matches should
-- ever count towards standings.
--
-- Cause: restructure-scoring-into-win-samediff-draw.sql (2026-09-16) and
-- add-goal-difference-bonus-points.sql both did `create or replace
-- function lock_expired_rounds()` from the ORIGINAL round-wide version, not
-- the per-match-kickoff one (update-lock-expired-rounds-per-match-kickoff.sql
-- / update-lock-expired-rounds-per-day-default-fill.sql). So the moment
-- round 5 locked (its first kickoff), that function seeded EVERY match in
-- the round to 0-0, scored every prediction against that fake result
-- (draw predictions earn points against 0-0), and default-filled every
-- match -- including the ones days away. Same class of bug as
-- fix-retroactive-early-seed-repair.sql, reintroduced by the 09-16
-- migrations.
--
-- This migration does three things, all safe to re-run:
--
-- 1) lock_expired_rounds(): per-match-kickoff gating restored, on top of
--    the current 5-column scoring model (compute_prediction_points()).
-- 2) recompute_round_standings(): structural guard -- a match only counts
--    if it is ended (is_final) or its kickoff has passed, the same
--    definition src/lib/matchStatus.ts uses. Even a stale points_earned on
--    a not-started match can no longer leak into round_participation.
-- 3) One-time data repair for the matches already force-seeded.
--
-- Run once in the Supabase SQL editor, then check /leaderboard.

-- 1) lock_expired_rounds() ---------------------------------------------------
create or replace function lock_expired_rounds()
returns void
language plpgsql
security definer
as $$
declare
  r record;
  v_win_hit int;
  v_win_towards int;
  v_same_diff_bonus int;
  v_draw_hit int;
  v_draw_towards int;
begin
  -- Transition only -- default predictions and 0-0 seeding happen below,
  -- per match, gated on that match's own kickoff_at.
  update rounds set status = 'locked'
  where status = 'open' and deadline_at <= now();

  select win_hit_points, win_towards_points, same_diff_bonus_points, draw_hit_points, draw_towards_points
  into v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
  from scoring_rules order by effective_from desc limit 1;

  for r in
    select distinct rounds.id
    from rounds
    join matches on matches.round_id = rounds.id
    where rounds.status in ('locked', 'finished')
      and matches.home_score is null
      and matches.kickoff_at <= now()
  loop
    -- Default predictions for approved participants who still haven't
    -- predicted a match whose kickoff has already passed.
    insert into predictions (user_id, match_id, pred_home_score, pred_away_score, is_default)
    select rp.user_id, m.id, u.default_home_score, u.default_away_score, true
    from round_participation rp
    join matches m on m.round_id = r.id
    join users u on u.id = rp.user_id
    where rp.round_id = r.id
      and rp.payment_status = 'approved'
      and u.default_home_score is not null
      and u.default_away_score is not null
      and m.kickoff_at <= now()
      and not exists (
        select 1 from predictions p where p.user_id = rp.user_id and p.match_id = m.id
      );

    -- Kickoff baseline: only matches that have actually kicked off.
    update matches set home_score = 0, away_score = 0, is_final = false
    where round_id = r.id and home_score is null and kickoff_at <= now();

    update predictions p
    set points_earned = compute_prediction_points(
      p.pred_home_score, p.pred_away_score, m.home_score, m.away_score,
      v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
    )
    from matches m
    where p.match_id = m.id and m.round_id = r.id
      and m.home_score is not null;

    perform recompute_round_standings(r.id);
  end loop;
end;
$$;

grant execute on function lock_expired_rounds() to authenticated;

-- 2) recompute_round_standings() ---------------------------------------------
-- Same as add-match-main-event-tiebreak.sql (points -> exact hits -> main
-- event points), plus the started-matches-only filter.
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
  set rank = ranked.rnk
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

-- 3) Data repair -------------------------------------------------------------
-- A match whose kickoff is still in the future cannot have a real result,
-- so any score on it is leftover bad seeding (see fix-retroactive-early-
-- seed-repair.sql for the same reasoning).
update matches
set home_score = null, away_score = null, is_final = false
where kickoff_at > now()
  and home_score is not null;

update predictions p
set points_earned = null
from matches m
where p.match_id = m.id
  and m.kickoff_at > now()
  and p.points_earned is not null;

do $$
declare
  r record;
begin
  for r in select id from rounds where status in ('locked', 'finished') loop
    perform recompute_round_standings(r.id);
  end loop;
end;
$$;
