-- Migration 24: let participants see everyone's predictions for a round
-- once that round has started (status <> 'open') — previously only the
-- predictor themselves (or the manager) could read a prediction row at all
-- (rls.sql's predictions_select_own_or_manager).
--
-- Additive: Postgres combines multiple permissive policies on the same
-- table/action with OR, so this doesn't touch or replace the existing
-- policy — it just adds a second way a select can be allowed.

create policy "predictions_select_locked_round"
  on predictions for select
  to authenticated
  using (
    exists (
      select 1
      from matches m
      join rounds r on r.id = m.round_id
      where m.id = predictions.match_id
        and r.status <> 'open'
    )
  );
