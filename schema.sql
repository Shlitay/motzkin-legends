-- Prediction League — Database Schema (Supabase / Postgres)
-- Reflects decisions locked on 2026-08-01:
--   * Scoring is manager-editable (not hardcoded)
--   * Missed predictions fall back to a per-user default score
--   * Round tiebreaker = most exact-score predictions
-- Reflects decisions locked on 2026-08-02:
--   * Login is Google OAuth via Supabase Auth (no passwords stored here)
--   * Stats distinguish "towards" (correct winner, wrong score) from "hit" (exact score)

-- =========================================================
-- USERS  (profile row, 1:1 with Supabase's auth.users via Google OAuth)
-- =========================================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'participant' check (role in ('manager', 'participant')),
  avatar text,                          -- emoji or avatar identifier (separate from Google photo)
  default_home_score int,               -- null until onboarding sets it
  default_away_score int,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row the moment someone signs in with Google for the
-- first time, so onboarding (setting the default score) has a row to update.
create function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================
-- SCORING RULES  (manager-editable, versioned so history stays correct)
-- =========================================================
create table scoring_rules (
  id uuid primary key default gen_random_uuid(),
  exact_score_points int not null default 10,
  correct_result_points int not null default 5,
  effective_from timestamptz not null default now(),
  created_by uuid references users(id)
);
-- Only the most recent row (by effective_from) is "current".
-- Historical rounds keep their points_earned as scored at the time,
-- so changing this table never rewrites past results.

-- =========================================================
-- SEASONS
-- =========================================================
create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date
);

-- =========================================================
-- ROUNDS
-- =========================================================
create table rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id),
  round_number int not null,
  deadline_at timestamptz not null,     -- kickoff of first match = auto-lock time
  status text not null default 'open' check (status in ('open', 'locked', 'finished')),
  unique (season_id, round_number)
);

-- =========================================================
-- TEAMS  (branding colors, used for kit-colored UI)
-- =========================================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text check (secondary_color ~ '^#[0-9a-fA-F]{6}$')
);

insert into teams (name, primary_color, secondary_color) values
  ('Beitar Jerusalem', '#c6c512', '#11222c'),
  ('Bnei Sakhnin', '#c73332', '#fffeff'),
  ('Hapoel Beer-Sheva', '#da2332', '#0f4772'),
  ('Hapoel Haifa', '#ec434f', '#0c0c14'),
  ('Hapoel Kiryat Shmona', '#2b2c7d', '#c5c5c5'),
  ('Hapoel Jerusalem', '#ca2e32', '#1d1010'),
  ('Hapoel Petach-Tikva', '#0566c4', '#0a0e28'),
  ('Hapoel Ramat Gan', '#ae1527', '#d2c5c0'),
  ('Hapoel Tel Aviv', '#d02038', '#cdc6df'),
  ('Ironi Tiberias', '#07227c', '#04a3d4'),
  ('Maccabi Haifa', '#03b985', '#f0f4f5'),
  ('Maccabi Petach-Tikva', '#3f80c2', '#6e9cc4'),
  ('Maccabi Netanya', '#facf17', '#000405'),
  ('Maccabi Tel-Aviv', '#eadb0d', '#335573');

-- =========================================================
-- MATCHES  (7 per round)
-- =========================================================
create table matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) not null,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  home_score int,                       -- filled in after match finishes
  away_score int
);

-- =========================================================
-- PREDICTIONS  (one row per user per match)
-- =========================================================
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  match_id uuid references matches(id) not null,
  pred_home_score int not null,
  pred_away_score int not null,
  is_default boolean not null default false,  -- true if auto-filled from user's default, not manually entered
  points_earned int,                          -- filled in once match result is known
  submitted_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- =========================================================
-- ROUND PARTICIPATION  (drives approval dashboard + leaderboard)
-- =========================================================
create table round_participation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  round_id uuid references rounds(id) not null,
  payment_status text not null default 'waiting'
    check (payment_status in ('waiting', 'approved', 'rejected')),
  total_points int default 0,
  exact_score_count int default 0,      -- "hit" — used for tiebreaker
  correct_result_count int default 0,   -- "towards" — right winner, wrong score
  rank int,
  is_round_winner boolean default false, -- crown 👑
  unique (user_id, round_id)
);

-- =========================================================
-- SEASON STATS  (view — computed, not stored)
-- =========================================================
create view season_stats as
select
  u.id as user_id,
  u.full_name,
  count(rp.id) filter (where rp.payment_status = 'approved') as rounds_played,
  count(rp.id) filter (where rp.is_round_winner) as rounds_won,
  coalesce(sum(rp.total_points), 0) as total_points,
  coalesce(sum(rp.exact_score_count), 0) as season_hits,
  coalesce(sum(rp.correct_result_count), 0) as season_towards,
  round(avg(rp.total_points) filter (where rp.payment_status = 'approved'), 2) as avg_points
from users u
left join round_participation rp on rp.user_id = u.id
where u.role = 'participant'
group by u.id, u.full_name;

-- =========================================================
-- Notes
-- =========================================================
-- Ranking query per round (points desc, then exact_score_count desc):
--   select * from round_participation
--   where round_id = :round_id and payment_status = 'approved'
--   order by total_points desc, exact_score_count desc;
--
-- Default-prediction fallback logic (run at lock time, e.g. via a scheduled
-- Supabase Edge Function or cron job at each round's deadline_at):
--   for every approved participant with no predictions row for a given match
--   in the round, insert one using users.default_home_score / default_away_score
--   and set is_default = true.
