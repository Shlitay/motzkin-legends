-- Prediction Legends redesign, phase 5 (design/HANDOFF.md §9, §10): where a
-- match's result came from, so the live score feed never overwrites a result
-- the manager typed in by hand. Added 2026-11-11.
--
-- 1) matches.result_source: 'auto' (written by the score feed), 'manual'
--    (saved by the manager in /manager), or null (no result yet / from
--    before this migration).
-- 2) submit_match_result() marks the match 'manual'. Redefined from its
--    latest definition in add-score-feed.sql; only the update line is new.
-- 3) score_feed_apply() skips the score of a 'manual' match (the live clock
--    still updates) and marks what it writes 'auto'. Redefined from its
--    latest definition in score-feed-summary-score-order.sql; only the two
--    marked blocks are new.
-- 4) Manager read access to round_intro_seen (see the end of the file).
--
-- The manager can hand a match back to the feed from /manager ("חזרה
-- לאוטומטי"), which sets result_source back to null — the matches table's
-- manager write policy already allows that update. Safe to re-run.

alter table matches add column if not exists result_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_result_source_check'
  ) then
    alter table matches
      add constraint matches_result_source_check check (result_source in ('auto', 'manual'));
  end if;
end;
$$;

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
  update matches set result_source = 'manual' where id = p_match_id;
end;
$$;

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

    -- A result the manager entered by hand is never overwritten
    -- (add-result-source.sql). The live clock above still updates.
    if v_match.result_source = 'manual' then
      continue;
    end if;

    if v_match.home_score is distinct from v_home
       or v_match.away_score is distinct from v_away
       or v_final then
      perform apply_match_result(v_match.id, v_home, v_away, v_final);
      update matches set result_source = 'auto' where id = v_match.id;
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

-- 4) /manager's round-message section shows "נראתה ע״י x/y": let the
--    manager count who has seen this round's popup (players can still only
--    read their own row).
drop policy if exists "round_intro_seen_select_manager" on round_intro_seen;
create policy "round_intro_seen_select_manager"
  on round_intro_seen for select
  to authenticated
  using (is_manager());
