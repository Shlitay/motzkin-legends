-- Real gap found 2026-09-13, surfaced by a direct question ("can other
-- participants see tomorrow's predictions before they lock?"): the RLS
-- policy controlling who can read someone else's predictions
-- (predictions_select_locked_round, fix-predictions-locked-round-approved-
-- only.sql) gates on the WHOLE ROUND's status (r.status <> 'open'), not
-- per match. A round flips to 'locked' the moment its first match
-- anywhere kicks off -- so as soon as day 1 of a multi-day round starts,
-- every approved participant could already read everyone's predictions
-- for day 2/3's matches too, even though those are still open and
-- editable (per-day locking, shipped earlier this session, only ever
-- restricted editing -- visibility was left round-wide).
--
-- Fix: replace the round-status check with the same day-based gate
-- /predictions' isDayLocked() already uses client-side -- a match's
-- predictions become visible once *that match's own day's* earliest
-- kickoff (Israel-local calendar date) has passed, independent of other
-- days in the round. `(kickoff_at at time zone 'Asia/Jerusalem')::date`
-- is the SQL equivalent of src/lib/israelTime.ts's israelDateKey().
--
-- No client-side change needed: ParticipantModal already renders "-" for
-- any match it doesn't get a predictions row back for (byMatch.get(m.id)
-- ?? null), so a day RLS now hides just displays as unpredicted instead
-- of leaking real numbers -- this was purely a database-layer gap.
--
-- drop + recreate (same as migration 25 did to migration 24) since
-- policies can't be create-or-replace'd. Run once in the SQL editor.

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
        and now() >= (
          select min(m2.kickoff_at)
          from matches m2
          where m2.round_id = m.round_id
            and (m2.kickoff_at at time zone 'Asia/Jerusalem')::date
              = (m.kickoff_at at time zone 'Asia/Jerusalem')::date
        )
    )
  );
