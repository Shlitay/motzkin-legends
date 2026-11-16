-- 4th tiebreaker: the hardest matches (added 2026-11-16).
-- Owner's rule: when players are still level on points, bullseyes and the
-- main match, the winner is whoever scored on the harder matches. For every
-- match a player earned points on (bullseye or direction), add the
-- pre-match odds of the result that happened (home win / draw / away win).
-- Highest total ranks first.
--
--   1) matches.odds_home / odds_draw / odds_away (Bet365 1X2, pre-match)
--   2) score_feed_odds_tick(): after a match ends, one API request fetches
--      its odds (own pg_net slot and cron job, shares the daily counter,
--      keeps 15 requests in reserve for live scores)
--   3) recompute_round_standings(): 4th order key. Based on its latest
--      definition, add-rank-movement-tracking.sql.
--   4) Round 1 of season 2: France–Turkey was entered by hand and never
--      linked to the API, so its fixture ID is set here to get its odds.
--
-- Safe to re-run.

-- 1) Columns ----------------------------------------------------------------
alter table matches
  add column if not exists odds_home numeric,
  add column if not exists odds_draw numeric,
  add column if not exists odds_away numeric,
  add column if not exists odds_attempts int not null default 0;

alter table score_feed
  add column if not exists odds_request_id bigint,
  add column if not exists odds_request_at timestamptz,
  add column if not exists odds_match_id uuid,
  add column if not exists odds_last_error text;

-- 2) Odds fetch -----------------------------------------------------------------
create or replace function score_feed_odds_tick()
returns void
language plpgsql
security definer
as $$
declare
  s score_feed%rowtype;
  v_resp record;
  v_payload jsonb;
  v_bm jsonb;
  v_values jsonb;
  v_home numeric;
  v_draw numeric;
  v_away numeric;
  v_round uuid;
  v_match matches%rowtype;
  v_key text;
  v_today date := (now() at time zone 'UTC')::date;
begin
  select * into s from score_feed where id = 1 for update;

  -- Step 1: the previous odds request's response.
  if s.odds_request_id is not null then
    select status_code, content, error_msg into v_resp
    from net._http_response where id = s.odds_request_id;

    if found then
      begin
        if v_resp.status_code = 200 then
          v_payload := v_resp.content::jsonb;
          -- Bet365 (id 8) when it has the match, otherwise the first bookmaker.
          select b into v_bm
          from jsonb_array_elements(coalesce(v_payload -> 'response' -> 0 -> 'bookmakers', '[]'::jsonb)) b
          order by ((b ->> 'id')::int = 8) desc
          limit 1;

          select bet -> 'values' into v_values
          from jsonb_array_elements(coalesce(v_bm -> 'bets', '[]'::jsonb)) bet
          where (bet ->> 'id')::int = 1
          limit 1;

          select max((v ->> 'odd')::numeric) filter (where v ->> 'value' = 'Home'),
                 max((v ->> 'odd')::numeric) filter (where v ->> 'value' = 'Draw'),
                 max((v ->> 'odd')::numeric) filter (where v ->> 'value' = 'Away')
          into v_home, v_draw, v_away
          from jsonb_array_elements(coalesce(v_values, '[]'::jsonb)) v;

          if v_home is not null and v_draw is not null and v_away is not null then
            update matches
            set odds_home = v_home, odds_draw = v_draw, odds_away = v_away
            where id = s.odds_match_id
            returning round_id into v_round;
            perform recompute_round_standings(v_round);
            update score_feed set odds_last_error = null where id = 1;
          else
            update score_feed
            set odds_last_error = left('no odds in response: ' || coalesce(v_payload ->> 'errors', ''), 300)
            where id = 1;
          end if;
        else
          update score_feed
          set odds_last_error = format('HTTP %s %s', coalesce(v_resp.status_code::text, ''), coalesce(v_resp.error_msg, ''))
          where id = 1;
        end if;
      exception when others then
        update score_feed set odds_last_error = sqlerrm where id = 1;
      end;
      update score_feed set odds_request_id = null, odds_match_id = null where id = 1;
      return;
    elsif s.odds_request_at < now() - interval '3 minutes' then
      update score_feed
      set odds_request_id = null, odds_match_id = null, odds_last_error = 'no response from the API'
      where id = 1;
    end if;
    return;
  end if;

  if s.paused then
    return;
  end if;

  -- Step 2: an ended match without odds. The API keeps odds about 7 days
  -- after a match; two tries each so a match with no odds can't burn quota.
  select * into v_match
  from matches
  where is_final
    and api_fixture_id is not null
    and odds_home is null
    and odds_attempts < 2
    and kickoff_at > now() - interval '6 days'
  order by kickoff_at
  limit 1;

  if v_match.id is null then
    return;
  end if;

  if s.requests_day is distinct from v_today then
    update score_feed set requests_day = v_today, requests_today = 0 where id = 1;
    s.requests_today := 0;
  end if;

  -- Live scores come first: keep 15 requests of the daily cap for them.
  if s.requests_today >= s.daily_cap - 15 then
    return;
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'api_football_key';
  if v_key is null then
    return;
  end if;

  update matches set odds_attempts = odds_attempts + 1 where id = v_match.id;

  update score_feed
  set odds_request_id = net.http_get(
        url := 'https://v3.football.api-sports.io/odds',
        params := jsonb_build_object('fixture', v_match.api_fixture_id::text, 'bet', '1'),
        headers := jsonb_build_object('x-apisports-key', v_key),
        timeout_milliseconds := 30000
      ),
      odds_request_at = now(),
      odds_match_id = v_match.id,
      requests_today = requests_today + 1
  where id = 1;
end;
$$;

-- Every 2 minutes; the fetch itself only runs after a match has ended.
select cron.schedule('score-feed-odds', '*/2 * * * *', 'select score_feed_odds_tick()');

-- 3) recompute_round_standings() --------------------------------------------
-- Same as add-rank-movement-tracking.sql, plus the 4th order key.
create or replace function recompute_round_standings(p_round_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update round_participation rp
  set total_points = coalesce(agg.total_points, 0),
      exact_score_count = coalesce(agg.exact_count, 0),
      correct_result_count = coalesce(agg.correct_count, 0)
  from round_participation rp0
  left join (
    select p.user_id,
      coalesce(sum(p.points_earned), 0) as total_points,
      count(*) filter (
        where p.pred_home_score = m.home_score and p.pred_away_score = m.away_score
      ) as exact_count,
      count(*) filter (
        where m.home_score is not null
          and not (p.pred_home_score = m.home_score and p.pred_away_score = m.away_score)
          and sign(p.pred_home_score - p.pred_away_score) = sign(m.home_score - m.away_score)
      ) as correct_count
    from predictions p
    join matches m on m.id = p.match_id
    where m.round_id = p_round_id
      and (m.is_final or m.kickoff_at <= now())
    group by p.user_id
  ) agg on agg.user_id = rp0.user_id
  where rp.id = rp0.id and rp.round_id = p_round_id;

  update round_participation rp
  set previous_rank = rp.rank,
      rank = ranked.rnk
  from (
    select rp2.id,
      rank() over (
        order by
          rp2.total_points desc,
          rp2.exact_score_count desc,
          coalesce(main_event_pred.points_earned, 0) desc,
          coalesce(diff.difficulty, 0) desc
      ) as rnk
    from round_participation rp2
    left join matches me
      on me.round_id = p_round_id and me.is_main_event
      and (me.is_final or me.kickoff_at <= now())
    left join predictions main_event_pred
      on main_event_pred.user_id = rp2.user_id and main_event_pred.match_id = me.id
    -- 4th: sum of the pre-match odds of the results the player got right.
    left join (
      select p.user_id,
        sum(case
              when m.home_score > m.away_score then m.odds_home
              when m.home_score < m.away_score then m.odds_away
              else m.odds_draw
            end) as difficulty
      from predictions p
      join matches m on m.id = p.match_id
      where m.round_id = p_round_id
        and m.is_final
        and coalesce(p.points_earned, 0) > 0
      group by p.user_id
    ) diff on diff.user_id = rp2.user_id
    where rp2.round_id = p_round_id
  ) ranked
  where rp.id = ranked.id;
end;
$$;

grant execute on function recompute_round_standings(uuid) to authenticated;

-- 4) Round 1: link France–Turkey to its API fixture so it gets odds too ------
update matches m
set api_fixture_id = 1528982
from rounds r
join seasons s on s.id = r.season_id and s.name = 'עונה 2'
where m.round_id = r.id and r.round_number = 1
  and m.home_team = 'צרפת' and m.away_team = 'טורקיה'
  and m.api_fixture_id is null;

-- Check: which round-1 matches will get odds (api_fixture_id set).
select m.home_team, m.away_team, m.kickoff_at, m.is_final, m.api_fixture_id
from matches m
join rounds r on r.id = m.round_id
join seasons s on s.id = r.season_id and s.name = 'עונה 2'
where r.round_number = 1
order by m.kickoff_at;
