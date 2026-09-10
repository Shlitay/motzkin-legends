-- Changes the round-standings tiebreak rules (requested 2026-09-10):
-- previously points -> exact-hit count -> earliest submission time.
-- New rule: points -> exact-hit count -> whoever earned more points on
-- one specific match per round the manager flags as "the main event"
-- (e.g. a derby). Earliest-submission-time tiebreak is dropped entirely
-- -- per the user, prediction timing is no longer meant to matter at all,
-- which is also why round 4's predictions_open_at gets cleared below.
--
-- 1) New column + constraint: at most one match per round can be the
--    main event. A partial unique index (not a plain unique constraint)
--    since most rows have is_main_event = false and that's fine -- only
--    a second *true* row for the same round is disallowed.
alter table matches add column is_main_event boolean not null default false;

create unique index matches_one_main_event_per_round
  on matches (round_id) where is_main_event;

-- 2) set_main_event(): lets the manager flag (or clear) a round's main
-- event from /manager's match-results screen, same security-definer +
-- is_manager() gate pattern as submit_match_result(). One atomic UPDATE
-- across the whole round (not two separate client-side writes) so the
-- partial unique index above is never even transiently violated --
-- p_match_id null clears the round's main event entirely (toggle off).
create or replace function set_main_event(p_round_id uuid, p_match_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_manager() then
    raise exception 'only the manager can set the main event';
  end if;

  update matches
  set is_main_event = (p_match_id is not null and id = p_match_id)
  where round_id = p_round_id;
end;
$$;

grant execute on function set_main_event(uuid, uuid) to authenticated;

-- 3) New tiebreak in recompute_round_standings(): replaces
-- coalesce(first_pred.first_submitted_at, 'infinity') asc with the
-- user's own predictions.points_earned for whichever match in the round
-- has is_main_event = true, descending (nulls -- no main event set for
-- this round, or this participant simply has no prediction for it --
-- coalesce to 0, same as everyone tying on this tiebreak the way they
-- would have before migration 20 introduced a 3rd tiebreak at all).
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
          coalesce(main_event_pred.points_earned, 0) desc
      ) as rnk
    from round_participation rp2
    left join matches me on me.round_id = p_round_id and me.is_main_event
    left join predictions main_event_pred
      on main_event_pred.user_id = rp2.user_id and main_event_pred.match_id = me.id
    where rp2.round_id = p_round_id
  ) ranked
  where rp.id = ranked.id;
end;
$$;

grant execute on function recompute_round_standings(uuid) to authenticated;

-- 4) Drop the "predict early" restriction on the round currently in
-- progress -- null means /predictions' predictionsOpen check always
-- passes (see add-predictions-open-at.sql). Future seed-roundN.sql
-- scripts should simply stop setting predictions_open_at at all, rather
-- than setting a Thursday-20:00-style value -- null is already the
-- correct "no restriction" default.
update rounds set predictions_open_at = null where round_number = 4;
