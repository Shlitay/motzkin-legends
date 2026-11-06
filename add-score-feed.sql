-- Automatic score feed from API-Football (added 2026-11-06).
--
-- A pg_cron job runs score_feed_tick() every minute, inside Supabase. While
-- at least one match is live (kicked off within the last 4 hours and not
-- final), it requests that day's fixtures from API-Football every
-- `interval_minutes` (default 10). Live goals are written with
-- is_final = false and the full-time result with is_final = true, through
-- the same scoring path as the manager's own "תוצאות מחזור" screen.
--
-- Safety rules:
--   * Never touches a match that is already final, so a manual final
--     always wins. A manual live score can be overwritten by the next
--     poll; pause the feed first to keep it.
--   * Never writes before a match's own kickoff_at.
--   * Daily request cap (default 90 of the free plan's 100; resets 00:00
--     UTC, like the API's own quota).
--   * The manager can pause and resume it from /manager -> "עדכון אוטומטי".
--   * After extra time or penalties, records the 90-minute score.
--
-- Matches are linked to API fixtures through matches.api_fixture_id.
-- Missing links are filled in automatically by matching both teams
-- (team_api_ids: API team id, or the API's team name as a fallback) and a
-- kickoff within 6 hours. New teams in future rounds need a row in
-- team_api_ids.
--
-- The API key is NOT in this file. It is stored separately in Supabase
-- Vault under the name 'api_football_key'.
--
-- To also make score_feed_tick() callable without the manager check,
-- submit_match_result()'s body moves into apply_match_result(), which only
-- the database itself can call. submit_match_result() keeps its signature,
-- its manager check, and its behaviour. Its body is copied from the latest
-- definition, restructure-scoring-into-win-samediff-draw.sql.
--
-- Safe to re-run.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 1) Scoring core, callable only by the database --------------------------
create or replace function apply_match_result(
  p_match_id uuid,
  p_home_score int,
  p_away_score int,
  p_is_final boolean
)
returns void
language plpgsql
security definer
as $$
declare
  v_round_id uuid;
  v_win_hit int;
  v_win_towards int;
  v_same_diff_bonus int;
  v_draw_hit int;
  v_draw_towards int;
begin
  update matches set home_score = p_home_score, away_score = p_away_score, is_final = p_is_final
  where id = p_match_id
  returning round_id into v_round_id;

  select win_hit_points, win_towards_points, same_diff_bonus_points, draw_hit_points, draw_towards_points
  into v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
  from scoring_rules order by effective_from desc limit 1;

  update predictions p
  set points_earned = compute_prediction_points(
    p.pred_home_score, p.pred_away_score, p_home_score, p_away_score,
    v_win_hit, v_win_towards, v_same_diff_bonus, v_draw_hit, v_draw_towards
  )
  where p.match_id = p_match_id;

  perform recompute_round_standings(v_round_id);

  -- Round completion follows the matches, not the other way around:
  -- 'finished' once every match in the round is marked final, reverted
  -- back to 'locked' if a final gets unchecked (correcting a mistake).
  if not exists (select 1 from matches where round_id = v_round_id and not is_final) then
    update rounds set status = 'finished' where id = v_round_id;
  else
    update rounds set status = 'locked' where id = v_round_id and status = 'finished';
  end if;
end;
$$;

revoke all on function apply_match_result(uuid, int, int, boolean) from public, anon, authenticated;

create or replace function submit_match_result(
  p_match_id uuid,
  p_home_score int,
  p_away_score int,
  p_is_final boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not is_manager() then
    raise exception 'only the manager can submit match results';
  end if;

  perform apply_match_result(p_match_id, p_home_score, p_away_score, p_is_final);
end;
$$;

-- 2) Fixture links and team lookup -----------------------------------------
alter table matches add column if not exists api_fixture_id bigint;
create unique index if not exists matches_api_fixture_id_key
  on matches (api_fixture_id) where api_fixture_id is not null;

create table if not exists team_api_ids (
  team_name text primary key,   -- matches.home_team / away_team
  api_team_id int unique,       -- API-Football team id
  api_name text                 -- API-Football team name, used when the id is unknown
);

alter table team_api_ids enable row level security;  -- no policies: database only

insert into team_api_ids (team_name, api_team_id, api_name) values
  ('הפועל פתח תקווה',   4488, 'Hapoel Petah Tikva'),
  ('הפועל רמת גן',      4489, 'Hapoel Ramat Gan'),
  ('מכבי חיפה',         4195, 'Maccabi Haifa'),
  ('מכבי נתניה',        4505, 'Maccabi Netanya'),
  ('הפועל ירושלים',     4486, 'Hapoel Katamon'),
  ('בני סכנין',         4481, 'Bnei Sakhnin'),
  ('הפועל קריית שמונה', 4510, 'Ironi Kiryat Shmona'),
  ('הפועל חיפה',        2253, 'Hapoel Haifa'),
  ('עירוני טבריה',      6181, 'Ironi Tiberias'),
  ('בית"ר ירושלים',     657,  'Beitar Jerusalem'),
  ('הפועל באר שבע',     563,  'Hapoel Beer Sheva'),
  ('הפועל תל אביב',     null, 'Hapoel Tel Aviv'),
  ('ולנסיה',            532,  'Valencia'),
  ('ריאל מדריד',        541,  'Real Madrid'),
  ('ברצלונה',           529,  'Barcelona'),
  ('אתלטיקו מדריד',     530,  'Atletico Madrid'),
  ('נאפולי',            492,  'Napoli'),
  ('לאציו',             487,  'Lazio'),
  ('מארסיי',            81,   'Marseille'),
  ('לאנס',              116,  'Lens'),
  ('אייאקס',            194,  'Ajax'),
  ('טוונטה',            415,  'Twente')
on conflict (team_name) do nothing;

-- Round 10's Saturday fixtures, already confirmed against the API.
update matches m
set api_fixture_id = v.fixture_id
from rounds r,
(values
  ('הפועל פתח תקווה',   'הפועל רמת גן',  1555543::bigint),
  ('מכבי חיפה',         'מכבי נתניה',    1555547::bigint),
  ('הפועל ירושלים',     'בני סכנין',     1555542::bigint),
  ('הפועל קריית שמונה', 'הפועל חיפה',    1555546::bigint),
  ('עירוני טבריה',      'בית"ר ירושלים', 1555545::bigint),
  ('ולנסיה',            'ריאל מדריד',    1570451::bigint)
) as v(home_team, away_team, fixture_id)
where r.id = m.round_id and r.round_number = 10
  and m.home_team = v.home_team and m.away_team = v.away_team
  and m.api_fixture_id is null;

-- 3) Feed state (singleton) -----------------------------------------------
create table if not exists score_feed (
  id int primary key default 1 check (id = 1),
  paused boolean not null default false,
  interval_minutes int not null default 10,
  daily_cap int not null default 90,
  requests_day date,
  requests_today int not null default 0,
  last_request_at timestamptz,
  last_request_id bigint,
  last_request_date date,
  last_checked_at timestamptz,
  last_update_at timestamptz,
  last_update_summary text,
  last_error text,
  last_error_at timestamptz
);

insert into score_feed (id) values (1) on conflict (id) do nothing;

alter table score_feed enable row level security;

drop policy if exists "score_feed_select_manager" on score_feed;
create policy "score_feed_select_manager"
  on score_feed for select
  to authenticated
  using (is_manager());

create or replace function set_score_feed_paused(p_paused boolean)
returns void
language plpgsql
security definer
as $$
begin
  if not is_manager() then
    raise exception 'only the manager can change the score feed';
  end if;
  update score_feed set paused = p_paused where id = 1;
end;
$$;

-- Makes the next tick (within a minute) poll right away, if a match is live.
create or replace function score_feed_check_now()
returns void
language plpgsql
security definer
as $$
begin
  if not is_manager() then
    raise exception 'only the manager can change the score feed';
  end if;
  update score_feed set last_request_at = null where id = 1 and last_request_id is null;
end;
$$;

grant execute on function set_score_feed_paused(boolean) to authenticated;
grant execute on function score_feed_check_now() to authenticated;

-- 4) Applying one API response ---------------------------------------------
create or replace function score_feed_apply(p_payload jsonb)
returns text
language plpgsql
security definer
as $$
declare
  f jsonb;
  v_errors jsonb := p_payload -> 'errors';
  v_fixture_id bigint;
  v_status text;
  v_home int;
  v_away int;
  v_final boolean;
  v_match matches%rowtype;
  v_changes text[] := '{}';
begin
  if v_errors is not null and (
       (jsonb_typeof(v_errors) = 'object' and v_errors <> '{}'::jsonb)
    or (jsonb_typeof(v_errors) = 'array' and jsonb_array_length(v_errors) > 0)
  ) then
    raise exception 'API error: %', v_errors::text;
  end if;

  -- Default predictions and the 0-0 kickoff baseline first, exactly as
  -- when someone opens the app.
  perform lock_expired_rounds();

  for f in select value from jsonb_array_elements(coalesce(p_payload -> 'response', '[]'::jsonb))
  loop
    v_fixture_id := (f -> 'fixture' ->> 'id')::bigint;

    -- SELECT INTO with no row sets every field to null, so v_match.id
    -- doubles as the "found" check here and below.
    select * into v_match from matches where api_fixture_id = v_fixture_id;

    if v_match.id is null then
      select m.* into v_match
      from matches m
      join team_api_ids th on th.team_name = m.home_team
      join team_api_ids ta on ta.team_name = m.away_team
      where m.api_fixture_id is null
        and (th.api_team_id = (f -> 'teams' -> 'home' ->> 'id')::int
             or lower(th.api_name) = lower(f -> 'teams' -> 'home' ->> 'name'))
        and (ta.api_team_id = (f -> 'teams' -> 'away' ->> 'id')::int
             or lower(ta.api_name) = lower(f -> 'teams' -> 'away' ->> 'name'))
        and abs(extract(epoch from (m.kickoff_at - (f -> 'fixture' ->> 'date')::timestamptz))) <= 6 * 3600
      limit 1;

      if v_match.id is null then
        continue;
      end if;

      update matches set api_fixture_id = v_fixture_id where id = v_match.id;
    end if;

    if v_match.is_final or v_match.kickoff_at > now() then
      continue;
    end if;

    v_status := f -> 'fixture' -> 'status' ->> 'short';

    if v_status in ('1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE') then
      v_home := (f -> 'goals' ->> 'home')::int;
      v_away := (f -> 'goals' ->> 'away')::int;
      v_final := false;
    elsif v_status in ('FT', 'AET', 'PEN') then
      v_home := coalesce((f -> 'score' -> 'fulltime' ->> 'home')::int, (f -> 'goals' ->> 'home')::int);
      v_away := coalesce((f -> 'score' -> 'fulltime' ->> 'away')::int, (f -> 'goals' ->> 'away')::int);
      v_final := true;
    else
      continue;  -- not started, postponed, cancelled, abandoned, etc.
    end if;

    if v_home is null or v_away is null then
      continue;
    end if;

    if v_match.home_score is distinct from v_home
       or v_match.away_score is distinct from v_away
       or v_final then
      perform apply_match_result(v_match.id, v_home, v_away, v_final);
      v_changes := v_changes || format('%s %s-%s %s%s',
        v_match.home_team, v_home, v_away, v_match.away_team,
        case when v_final then ' (סיום)' else '' end);
    end if;
  end loop;

  return nullif(array_to_string(v_changes, ' · '), '');
end;
$$;

-- 5) The tick ---------------------------------------------------------------
create or replace function score_feed_tick()
returns void
language plpgsql
security definer
as $$
declare
  s score_feed%rowtype;
  v_resp record;
  v_summary text;
  v_dates date[];
  v_date date;
  v_key text;
  v_today date := (now() at time zone 'UTC')::date;
begin
  select * into s from score_feed where id = 1 for update;

  -- Step 1: handle the previous request's response, if it has arrived.
  if s.last_request_id is not null then
    select status_code, content, error_msg, timed_out into v_resp
    from net._http_response where id = s.last_request_id;

    if found then
      begin
        if v_resp.status_code = 200 then
          v_summary := score_feed_apply(v_resp.content::jsonb);
          update score_feed set last_checked_at = now(), last_error = null, last_error_at = null where id = 1;
          if v_summary is not null then
            update score_feed set last_update_at = now(), last_update_summary = v_summary where id = 1;
          end if;
        else
          update score_feed
          set last_error = format('HTTP %s %s', coalesce(v_resp.status_code::text, ''), coalesce(v_resp.error_msg, '')),
              last_error_at = now()
          where id = 1;
        end if;
      exception when others then
        update score_feed set last_error = sqlerrm, last_error_at = now() where id = 1;
      end;
      update score_feed set last_request_id = null where id = 1;
      s.last_request_id := null;
    elsif s.last_request_at < now() - interval '3 minutes' then
      update score_feed
      set last_request_id = null, last_error = 'no response from the API', last_error_at = now()
      where id = 1;
      s.last_request_id := null;
    else
      return;  -- still waiting for it
    end if;
  end if;

  if s.paused then
    return;
  end if;

  -- Step 2: is any match live right now?
  select array_agg(distinct (kickoff_at at time zone 'UTC')::date order by (kickoff_at at time zone 'UTC')::date)
  into v_dates
  from matches
  where not is_final
    and kickoff_at <= now()
    and kickoff_at > now() - interval '4 hours';

  if v_dates is null then
    return;
  end if;

  if s.last_request_at is not null
     and now() < s.last_request_at + make_interval(mins => s.interval_minutes) - interval '20 seconds' then
    return;
  end if;

  if s.requests_day is distinct from v_today then
    update score_feed set requests_day = v_today, requests_today = 0 where id = 1;
    s.requests_today := 0;
  end if;

  if s.requests_today >= s.daily_cap then
    update score_feed set last_error = 'daily request cap reached', last_error_at = now() where id = 1;
    return;
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'api_football_key';
  if v_key is null then
    update score_feed set last_error = 'API key missing from Vault', last_error_at = now() where id = 1;
    return;
  end if;

  -- Matches on two dates at once (rare): alternate between them.
  v_date := v_dates[1];
  if array_length(v_dates, 1) > 1 and s.last_request_date = v_dates[1] then
    v_date := v_dates[2];
  end if;

  update score_feed
  set last_request_id = net.http_get(
        url := 'https://v3.football.api-sports.io/fixtures',
        params := jsonb_build_object('date', v_date::text),
        headers := jsonb_build_object('x-apisports-key', v_key),
        timeout_milliseconds := 30000
      ),
      last_request_at = now(),
      last_request_date = v_date,
      requests_today = requests_today + 1
  where id = 1;
end;
$$;

revoke all on function score_feed_apply(jsonb) from public, anon, authenticated;
revoke all on function score_feed_tick() from public, anon, authenticated;

select cron.schedule('score-feed', '* * * * *', 'select score_feed_tick()');
