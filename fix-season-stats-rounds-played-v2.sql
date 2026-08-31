-- Migration 29: rounds_played (migration 28) still wasn't right — it
-- required payment_status = 'approved' AT THE TIME OF QUERYING, but the
-- new "reset approved participants" manager action (/manager, added this
-- same session) sets payment_status back to 'waiting' for a *finished*
-- round to prep for the next one's signups. That silently erased
-- rounds_played for anyone reset, even though they genuinely played and
-- scored points — total_points/rank were untouched by the reset, only
-- payment_status was.
--
-- Fix: for an already-started round (status <> 'open'), participation is
-- determined by whether they actually submitted predictions for it, not
-- by whatever payment_status currently says. Predictions rows are never
-- touched by the reset action, so this is immune to it.

create or replace view season_stats as
select
  u.id as user_id,
  u.full_name,
  count(rp.id) filter (
    where r.status <> 'open'
      and exists (
        select 1 from predictions p
        join matches m on m.id = p.match_id
        where m.round_id = rp.round_id and p.user_id = rp.user_id
      )
  ) as rounds_played,
  count(rp.id) filter (where rp.is_round_winner) as rounds_won,
  coalesce(sum(rp.total_points), 0) as total_points,
  coalesce(sum(rp.exact_score_count), 0) as season_hits,
  coalesce(sum(rp.correct_result_count), 0) as season_towards,
  round(
    avg(rp.total_points) filter (
      where r.status <> 'open'
        and exists (
          select 1 from predictions p
          join matches m on m.id = p.match_id
          where m.round_id = rp.round_id and p.user_id = rp.user_id
        )
    ),
    2
  ) as avg_points,
  u.avatar,
  coalesce(u.nickname, u.full_name) as display_name
from users u
left join round_participation rp on rp.user_id = u.id
left join rounds r on r.id = rp.round_id
where u.role = 'participant'
group by u.id, u.full_name, u.avatar, u.nickname;
