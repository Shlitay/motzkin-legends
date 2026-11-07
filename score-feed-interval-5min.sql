-- Score feed: check every 5 minutes instead of 10 (added 2026-11-07).
-- The feed sends one request per check no matter how many matches are live,
-- so a full match day is roughly 80-90 requests and stays under the
-- 90-a-day cap in score_feed.daily_cap (the API's own limit is 100).
update score_feed set interval_minutes = 5 where id = 1;

select interval_minutes, daily_cap from score_feed where id = 1;
