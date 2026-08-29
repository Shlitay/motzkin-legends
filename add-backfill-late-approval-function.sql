-- Fixes a real gap found live during round 2 (2026-08-26): the manager
-- approved a participant AFTER the round had already locked. The only
-- place that fills in default predictions for non-predicting
-- participants is lock_expired_rounds()'s one-time open->locked
-- transition (see update-lock-expired-rounds-per-match-kickoff.sql,
-- lines ~40-56), gated on `payment_status = 'approved'` evaluated at
-- that exact moment. A participant approved afterward is never swept
-- into it — they end up with zero rows in `predictions` for that
-- round's matches, so recompute_round_standings() (correctly) sums
-- them to 0. Their score isn't stale, it's genuinely missing data.
--
-- This adds a reusable, on-demand version of that same fill, scoped to
-- one participant + round: backfill their default prediction for any
-- match whose kickoff has already passed and that they still have no
-- prediction for (same default_home_score/default_away_score fallback
-- every other non-predicting approved participant already gets — not
-- the live/actual score, so a late approval never lets someone see the
-- result before "predicting"), score it against whatever the match's
-- current home_score/away_score already is, then recompute standings.
-- Matches that haven't kicked off yet are left alone on purpose — the
-- participant can and should submit a real prediction for those
-- themselves via /predictions now that they're approved.
--
-- Safe to call for anyone, anytime, not just late approvals: a no-op
-- if every already-kicked-off match already has a prediction row for
-- that user. src/app/manager/page.tsx's approve() calls this after
-- every approval so this gap can't recur.

create or replace function backfill_late_approval(p_round_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_exact_pts int;
  v_correct_pts int;
begin
  if not is_manager() then
    raise exception 'only the manager can backfill predictions';
  end if;

  select exact_score_points, correct_result_points into v_exact_pts, v_correct_pts
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
  set points_earned = case
    when p.pred_home_score = m.home_score and p.pred_away_score = m.away_score then v_exact_pts
    when sign(p.pred_home_score - p.pred_away_score) = sign(m.home_score - m.away_score) then v_correct_pts
    else 0
  end
  from matches m
  where p.match_id = m.id and p.user_id = p_user_id and m.round_id = p_round_id
    and m.home_score is not null;

  perform recompute_round_standings(p_round_id);
end;
$$;

grant execute on function backfill_late_approval(uuid, uuid) to authenticated;
