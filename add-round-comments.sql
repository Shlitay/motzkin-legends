-- Adds the round discussion feature: one public comment per participant per
-- round, shown on /home. Pure addition — new table only, doesn't touch any
-- existing data. Run once in the SQL editor.

create table round_comments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) not null,
  user_id uuid references users(id) not null,
  comment text not null check (char_length(trim(comment)) between 1 and 280),
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

alter table round_comments enable row level security;

-- Everyone can read every comment (it's a public discussion). A participant
-- can only post their own — the unique constraint above enforces "one
-- comment per round" at the DB level, not just in the UI.
create policy "round_comments_select_all"
  on round_comments for select
  to authenticated
  using (true);

create policy "round_comments_insert_own"
  on round_comments for insert
  to authenticated
  with check (user_id = auth.uid());

-- No update/delete policy: comments are permanent for v1.
