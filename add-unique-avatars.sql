-- Prediction Legends redesign, phase 4 (design/HANDOFF.md §5, §10):
-- every player gets one of the 30 library avatars (public/avatars/
-- avatar-01..30.svg), and no two players can hold the same one.
--
-- 1) Old emoji avatars are cleared. The app sends anyone with avatar = null
--    to the avatar step of /onboarding on their next visit (owner decision
--    2026-11-11: players pick again rather than being auto-assigned).
-- 2) Unique index, allowing many NULLs. The app turns a unique violation
--    (23505) into "someone just took this avatar, pick another".
--
-- Run AFTER the phase-4 code is live, so the new picker exists when players
-- are sent to choose. Safe to re-run.

update users set avatar = null where avatar is not null and avatar not like 'avatar-%';

create unique index if not exists users_avatar_unique on users (avatar) where avatar is not null;
