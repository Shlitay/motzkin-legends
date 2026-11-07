-- Score feed: fix the score order in the manager summary text (added 2026-11-07).
-- "קריית שמונה 1-0 הפועל חיפה" rendered with the 0 next to the home team in
-- the RTL popup, reading as the reverse result. Only the summary text was
-- wrong; scores written to matches were correct. Redefines score_feed_apply()
-- from score-feed-live-minute.sql (its latest definition), changing only the
-- summary format.

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

    -- Match clock for the live badge on /predictions. The page adds the
    -- minutes passed since live_updated_at, so it keeps ticking between
    -- the feed's 5-minute checks.
    update matches
    set live_status = v_status,
        live_minute = (f -> 'fixture' -> 'status' ->> 'elapsed')::int,
        live_extra = (f -> 'fixture' -> 'status' ->> 'extra')::int,
        live_updated_at = now()
    where id = v_match.id;

    if v_match.home_score is distinct from v_home
       or v_match.away_score is distinct from v_away
       or v_final then
      perform apply_match_result(v_match.id, v_home, v_away, v_final);
      -- Away score first on purpose: the summary is shown in a Hebrew
      -- (RTL) line, where "a-b" still renders left to right, so this puts
      -- each team's goals next to its own name (same as MatchRow's
      -- "תוצאה נוכחית" line).
      v_changes := v_changes || format('%s %s-%s %s%s',
        v_match.home_team, v_away, v_home, v_match.away_team,
        case when v_final then ' (סיום)' else '' end);
    end if;
  end loop;

  return nullif(array_to_string(v_changes, ' · '), '');
end;
$$;
