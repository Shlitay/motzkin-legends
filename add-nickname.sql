-- Adds an optional nickname, shown instead of the Google account's name
-- wherever that's set. Pure addition — predictions/round_participation are
-- keyed by user_id, not by name, so this can't touch existing data.
-- Run once in the SQL editor.

alter table users add column nickname text;

create or replace view season_stats as
select
  u.id as user_id,
  u.full_name,
  count(rp.id) filter (where rp.payment_status = 'approved') as rounds_played,
  count(rp.id) filter (where rp.is_round_winner) as rounds_won,
  coalesce(sum(rp.total_points), 0) as total_points,
  coalesce(sum(rp.exact_score_count), 0) as season_hits,
  coalesce(sum(rp.correct_result_count), 0) as season_towards,
  round(avg(rp.total_points) filter (where rp.payment_status = 'approved'), 2) as avg_points,
  u.avatar,
  coalesce(u.nickname, u.full_name) as display_name
from users u
left join round_participation rp on rp.user_id = u.id
where u.role = 'participant'
group by u.id, u.full_name, u.avatar, u.nickname;
