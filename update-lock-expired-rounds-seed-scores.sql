-- Extends lock_expired_rounds() (see add-lock-expired-rounds-function.sql)
-- to seed every match to a 0-0 baseline the instant a round locks, and
-- compute initial points/standings from it — "empty" isn't a real match
-- state once the round has begun; the manager updates the live score from
-- there via /manager's results screen.
--
-- create or replace with the same signature (no args) — safe to run
-- against the existing function, no drop needed. Run once in the SQL
-- editor, after add-match-is-final.sql and
-- add-recompute-round-standings-function.sql (this calls both).

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

    select exact_score_points, correct_result_points into v_exact_pts, v_correct_pts
    from scoring_rules order by effective_from desc limit 1;

    update predictions p
    set points_earned = case
      when p.pred_home_score = m.home_score and p.pred_away_score = m.away_score then v_exact_pts
      when sign(p.pred_home_score - p.pred_away_score) = sign(m.home_score - m.away_score) then v_correct_pts
      else 0
    end
    from matches m
    where p.match_id = m.id and m.round_id = r.id;

    perform recompute_round_standings(r.id);
  end loop;
end;
$$;

grant execute on function lock_expired_rounds() to authenticated;
