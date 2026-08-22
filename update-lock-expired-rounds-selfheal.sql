-- Fixes a gap in update-lock-expired-rounds-seed-scores.sql: the 0-0
-- seeding step was nested inside the loop that only fires for rounds
-- *transitioning* from 'open' to 'locked' right at that moment. Round 1
-- had already locked days before that seeding logic was added, so it
-- never re-qualifies for `status = 'open'` and never got seeded —
-- confirmed live: /manager still showed blank inputs for every
-- not-yet-scored match after the previous migration.
--
-- Splits the seeding into its own loop over *any* round with
-- status in ('locked', 'finished') that still has unscored matches,
-- regardless of when it locked — self-heals round 1 retroactively the
-- next time this function runs (any page load), and keeps working the
-- same way for future rounds. create or replace, same signature, safe.
-- Run once in the SQL editor, after the four migrations from the
-- previous change (add-match-is-final.sql,
-- add-recompute-round-standings-function.sql,
-- update-lock-expired-rounds-seed-scores.sql,
-- update-submit-match-result-final-flag.sql).

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

  -- Kickoff baseline: any locked-or-later round that still has unscored
  -- matches gets them seeded to 0-0 — not just rounds that *just* locked
  -- above, so this self-heals rounds that locked before this seeding
  -- logic existed too.
  select exact_score_points, correct_result_points into v_exact_pts, v_correct_pts
  from scoring_rules order by effective_from desc limit 1;

  for r in
    select distinct rounds.id
    from rounds
    join matches on matches.round_id = rounds.id
    where rounds.status in ('locked', 'finished')
      and matches.home_score is null
  loop
    update matches set home_score = 0, away_score = 0, is_final = false
    where round_id = r.id and home_score is null;

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
