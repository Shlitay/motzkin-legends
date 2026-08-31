-- Migration 28: fixes season_stats.rounds_played (and avg_points, which
-- divides by it) counting approval, not participation. Being approved for
-- a round that hasn't started yet (status = 'open') already counted as a
-- "played" round -- surfaced by round 3's new approvals showing up in
-- /leaderboard's "הכי הרבה השתתפויות" before round 3 had even begun.
--
-- Now requires the round to have actually started (status <> 'open') in
-- addition to being approved. total_points/season_hits/season_towards
-- don't need the same fix -- an unstarted round's points/hits/towards are
-- already 0/null, so summing them was never wrong.

create or replace view season_stats as
select
  u.id as user_id,
  u.full_name,
  count(rp.id) filter (where rp.payment_status = 'approved' and r.status <> 'open') as rounds_played,
  count(rp.id) filter (where rp.is_round_winner) as rounds_won,
  coalesce(sum(rp.total_points), 0) as total_points,
  coalesce(sum(rp.exact_score_count), 0) as season_hits,
  coalesce(sum(rp.correct_result_count), 0) as season_towards,
  round(avg(rp.total_points) filter (where rp.payment_status = 'approved' and r.status <> 'open'), 2) as avg_points,
  u.avatar,
  coalesce(u.nickname, u.full_name) as display_name
from users u
left join round_participation rp on rp.user_id = u.id
left join rounds r on r.id = rp.round_id
where u.role = 'participant'
group by u.id, u.full_name, u.avatar, u.nickname;
