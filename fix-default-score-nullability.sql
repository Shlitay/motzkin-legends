-- Fixes a bug where default_home_score/default_away_score defaulted to 1
-- (not null) instead of starting null — which meant the "does this user
-- need onboarding?" check in the auth callback never triggered, since it
-- looks for null values that were never actually null.
--
-- Run once in the SQL editor.

alter table users alter column default_home_score drop not null;
alter table users alter column default_home_score drop default;
alter table users alter column default_away_score drop not null;
alter table users alter column default_away_score drop default;

-- Nobody has genuinely completed onboarding yet (the bug blocked everyone),
-- so it's safe to reset every account back to "needs onboarding."
update users set default_home_score = null, default_away_score = null;
