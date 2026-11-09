-- Score feed: don't let the daily cap leave a match unfinished (added 2026-11-09).
-- On Sunday 8.11 the 90-request cap ran out before Atletico-Barcelona ended,
-- and the 4-hour live window closed at 00:00 UTC, the same moment the quota
-- reset, so the match never got its final score. Redefines score_feed_tick()
-- from add-score-feed.sql (its latest and only definition):
--   * unfinished matches stay eligible for 8 hours after kickoff (at most one
--     check every 30 minutes once past the first 4 hours)
--   * after 70 requests in a day, checks slow to every 10 minutes

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
  v_recent boolean;
  v_used int;
  v_interval int;
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
  -- Unfinished matches stay eligible for 8 hours, so a match the cap cut off
  -- late at night still gets its final score once the quota resets at 00:00
  -- UTC (the 4-hour window used to close at that exact moment for a 22:00
  -- Israel kickoff).
  select array_agg(distinct (kickoff_at at time zone 'UTC')::date order by (kickoff_at at time zone 'UTC')::date),
         bool_or(kickoff_at > now() - interval '4 hours')
  into v_dates, v_recent
  from matches
  where not is_final
    and kickoff_at <= now()
    and kickoff_at > now() - interval '8 hours';

  if v_dates is null then
    return;
  end if;

  v_used := case when s.requests_day = v_today then s.requests_today else 0 end;
  v_interval := s.interval_minutes;
  -- A full match day at 5 minutes needs about as many requests as the cap,
  -- so slow down once most are spent and keep enough for the final whistles.
  if v_used >= 70 then
    v_interval := greatest(v_interval, 10);
  end if;
  -- Only stragglers past the 4-hour mark: finishing them isn't urgent, and a
  -- match that never finishes (abandoned, postponed) mustn't burn the quota.
  if not v_recent then
    v_interval := greatest(v_interval, 30);
  end if;

  if s.last_request_at is not null
     and now() < s.last_request_at + make_interval(mins => v_interval) - interval '20 seconds' then
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
