-- Fixes a real gap surfaced by /predictions' new per-day locking (added
-- 2026-09-08, same session as seed-round4.sql -- round 4's matches are
-- staggered across 13-15.9.2026, the first round to actually need this):
-- lock_expired_rounds()'s default-prediction backfill only ran once, at
-- the exact moment a round's status flips 'open' -> 'locked' (i.e. the
-- round's very first kickoff, since deadline_at = first match's kickoff).
-- At that moment it inserted default predictions for *every* match in the
-- round for any approved participant still missing one -- including
-- matches on later days that haven't kicked off yet. That silently
-- defeated the whole point of per-day locking: a participant who simply
-- hadn't opened the app yet would get Monday's and Tuesday's games
-- defaulted the instant Sunday's game started, with no chance left to
-- enter a real prediction once they actually got to "the day after".
--
-- Fix: move the default-fill out of the one-time open->locked transition
-- and into the existing per-match-kickoff-gated loop below (the same one
-- that already seeds 0-0 into a kicked-off-but-unscored match, one round
-- at a time, every time this function runs) -- gated on
-- `m.kickoff_at <= now()`, same as that loop's own scope, so a match is
-- only ever defaulted once its own kickoff has actually passed, not the
-- moment the round overall locks. Idempotent either way (the `not
-- exists` check already made re-running safe), so applying this is safe
-- even mid-round.
--
-- create or replace, same signature. Run once in the SQL editor.

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
  -- Transition only -- default-prediction backfill now happens below,
  -- per-match-kickoff-gated, not all at once here.
  update rounds set status = 'locked'
  where status = 'open' and deadline_at <= now();

  select exact_score_points, correct_result_points into v_exact_pts, v_correct_pts
  from scoring_rules order by effective_from desc limit 1;

  -- Kickoff baseline: any locked-or-later round that has matches whose
  -- own kickoff_at has passed but are still unscored gets those specific
  -- matches seeded to 0-0 -- not every unscored match in the round
  -- regardless of whether it's actually started yet.
  for r in
    select distinct rounds.id
    from rounds
    join matches on matches.round_id = rounds.id
    where rounds.status in ('locked', 'finished')
      and matches.home_score is null
      and matches.kickoff_at <= now()
  loop
    -- Default predictions for approved participants who still haven't
    -- predicted a match whose kickoff has already passed -- moved here
    -- from the transition loop above, and now gated the same way the 0-0
    -- seeding below already is.
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
