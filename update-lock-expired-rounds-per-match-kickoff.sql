-- Fixes a real bug in the 0-0 seeding introduced by
-- update-lock-expired-rounds-seed-scores.sql and
-- update-lock-expired-rounds-selfheal.sql: both seed 0-0 into *every*
-- unscored match in a locked/finished round, with no check on that
-- match's own kickoff_at. That was harmless while every match in a round
-- shared one (fake) kickoff time, but round 1's real fixtures are
-- staggered across 22.8-3.9 (see fix-round1-kickoff-times.sql) — as
-- written, the moment the round locks, matches still days away from
-- actually kicking off would get force-seeded to 0-0 and start
-- contributing to standings, contradicting the not-started/live/ended
-- status already shown on /predictions.
--
-- This supersedes migrations 15 and 17 — safe to run directly even if 17
-- was never applied. Only change: the seeding loop, and the points
-- update that follows it, are now gated on `kickoff_at <= now()`, so a
-- match with a future kickoff is left completely alone (home_score stays
-- null, points_earned stays whatever it was, i.e. usually null) until
-- lock_expired_rounds() runs again after its real kickoff has passed —
-- it's called lazily on every round-dependent page load, so no schedule
-- is needed. recompute_round_standings() already treats null
-- points_earned/home_score as "not counted" (coalesce(sum(...), 0) and
-- explicit `m.home_score is not null` filters), so no change was needed
-- there.
--
-- create or replace, same signature, safe to run against the existing
-- function. Run once in the SQL editor.

create or replace function lock_expired_rounds()
returns void
language plpgsql
security definer
as $$
declare
  r record;
  v_exact_pts int;
  v_correct_pts int;
begin
  -- Transition: open rounds past their deadline become locked, and get
  -- default predictions filled in for anyone who didn't submit.
  for r in
    select id from rounds where status = 'open' and deadline_at <= now()
  loop
    update rounds set status = 'locked' where id = r.id;

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
  end loop;

  -- Kickoff baseline: any locked-or-later round that has matches whose
  -- own kickoff_at has passed but are still unscored gets those specific
  -- matches seeded to 0-0 — not every unscored match in the round
  -- regardless of whether it's actually started yet.
  select exact_score_points, correct_result_points into v_exact_pts, v_correct_pts
  from scoring_rules order by effective_from desc limit 1;

  for r in
    select distinct rounds.id
    from rounds
    join matches on matches.round_id = rounds.id
    where rounds.status in ('locked', 'finished')
      and matches.home_score is null
      and matches.kickoff_at <= now()
  loop
    update matches set home_score = 0, away_score = 0, is_final = false
    where round_id = r.id and home_score is null and kickoff_at <= now();

    update predictions p
    set points_earned = case
      when p.pred_home_score = m.home_score and p.pred_away_score = m.away_score then v_exact_pts
      when sign(p.pred_home_score - p.pred_away_score) = sign(m.home_score - m.away_score) then v_correct_pts
      else 0
    end
    from matches m
    where p.match_id = m.id and m.round_id = r.id
      and m.home_score is not null;

    perform recompute_round_standings(r.id);
  end loop;
end;
$$;

grant execute on function lock_expired_rounds() to authenticated;
