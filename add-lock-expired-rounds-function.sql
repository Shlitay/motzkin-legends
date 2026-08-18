-- Adds the auto-lock + per-match default-score fill. Called lazily by the
-- app (see src/lib/lockExpiredRounds.ts) whenever a round/predictions page
-- loads, rather than via a scheduled job. Pure addition — new function only.
--
-- It only ever touches rounds that are still 'open' AND already past their
-- own deadline_at, so running this migration is a no-op for any round whose
-- deadline hasn't passed yet.
--
-- security definer is required: an ordinary participant's session can't
-- otherwise flip rounds.status (manager-only RLS, see rls.sql) or insert
-- predictions rows for other users (predictions_insert_own restricts
-- user_id = auth.uid()). Run once in the SQL editor.

create or replace function lock_expired_rounds()
returns void
language plpgsql
security definer
as $$
declare
  r record;
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
  end loop;
end;
$$;

grant execute on function lock_expired_rounds() to authenticated;
