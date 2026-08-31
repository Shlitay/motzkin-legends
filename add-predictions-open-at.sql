-- Migration 27: lets a round open for payment/approval before predictions
-- can actually be submitted. New nullable column on rounds — null means
-- "no restriction" (predictions open as soon as the round does, which is
-- how rounds 1-2 already behave and keeps working unchanged for them).
-- Set explicitly per round at seed time, same manual pattern as
-- deadline_at (no automatic day-of-week derivation — one house rule
-- currently is "Thursday 20:00 Israel time", but this column just holds
-- whatever timestamp the manager actually wants for that round).
--
-- No RLS change needed — rounds is already select-all-authenticated
-- (rls.sql), this is just a new readable column on an existing table.

alter table rounds add column predictions_open_at timestamptz;

-- Round 3: predictions open Thursday 2026-09-03 20:00 Israel time
-- (17:00 UTC, Israel is UTC+3 under DST in September).
update rounds set predictions_open_at = '2026-09-03T17:00:00Z'::timestamptz
where round_number = 3;
