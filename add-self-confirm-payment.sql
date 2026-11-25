-- Self-confirmed payment (added 2026-11-25, owner's request). After a
-- player's first prediction of a round, /predictions shows a popup: pay ₪30
-- in Paybox now, or "I already sent". The latter approves them right away,
-- with no manager step.
--
-- 1) round_participation.self_confirmed_at: when the player confirmed
--    payment themselves. /manager marks these players ("דיווח עצמי") so the
--    owner can check them against Paybox and send anyone who didn't pay back
--    to waiting with the existing arrow button.
-- 2) confirm_my_payment(round_id): waiting -> approved, for the caller only.
--    Never touches a rejected player (the manager's call stands) or a
--    finished round. Returns the resulting status.
-- 3) backfill_late_approval(): redefined from its latest definition
--    (fix-backfill-late-approval-scoring-columns.sql). Only the guard is new:
--    an approved player may also run it for themselves, so a player who
--    first predicts on day 2 gets the same default predictions for day 1's
--    already-started matches as a manager approval would give them.
--
-- Safe to re-run.

begin;

alter table round_participation
  add column if not exists self_confirmed_at timestamptz;

create or replace function backfill_late_approval(p_round_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_win_hit int;
  v_win_towards int;
  v_same_diff_bonus int;
  v_draw_hit int;
  v_draw_towards int;
begin
  if not is_manager() and not (
    p_user_id = auth.uid()
    and exists (
      select 1 from round_participation rp
      where rp.round_id = p_round_id and rp.user_id = p_user_id and rp.payment_status = 'approved'
    )
  ) then
    raise exception 'only the manager can backfill predictions';
  end if;

  select win_hit_points, win_towards_points, same_diff_bonus_points, draw_hit_points, draw_towards_points
  into v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
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
  set points_earned = compute_prediction_points(
    p.pred_home_score, p.pred_away_score, m.home_score, m.away_score,
    v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
  )
  from matches m
  where p.match_id = m.id and p.user_id = p_user_id and m.round_id = p_round_id
    and m.home_score is not null;

  perform recompute_round_standings(p_round_id);
end;
$$;

create or replace function confirm_my_payment(p_round_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  if not exists (select 1 from rounds where id = p_round_id and status <> 'finished') then
    raise exception 'round is not open';
  end if;

  update round_participation
  set payment_status = 'approved', self_confirmed_at = now()
  where round_id = p_round_id and user_id = v_uid and payment_status = 'waiting';

  select payment_status into v_status
  from round_participation
  where round_id = p_round_id and user_id = v_uid;

  if v_status = 'approved' then
    perform backfill_late_approval(p_round_id, v_uid);
  end if;

  return v_status;
end;
$$;

revoke all on function confirm_my_payment(uuid) from public;
grant execute on function confirm_my_payment(uuid) to authenticated;

commit;
