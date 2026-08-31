-- Migration 25: tightens migration 24's policy — a locked round's
-- predictions should only be readable by users who were themselves an
-- *approved* participant of that specific round, not just any logged-in
-- user of the app.
--
-- Safe to run whether or not migration 24 was ever applied (drop is a
-- no-op if the policy doesn't exist yet).

drop policy if exists "predictions_select_locked_round" on predictions;

create policy "predictions_select_locked_round"
  on predictions for select
  to authenticated
  using (
    exists (
      select 1
      from matches m
      join rounds r on r.id = m.round_id
      join round_participation rp
        on rp.round_id = r.id
       and rp.user_id = auth.uid()
       and rp.payment_status = 'approved'
      where m.id = predictions.match_id
        and r.status <> 'open'
    )
  );
