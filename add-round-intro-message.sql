-- One-time "new round" popup per participant. The manager writes the
-- text per round from /manager -> "הודעת מחזור" (rounds.intro_message);
-- each participant sees it once per round, tracked server-side in
-- round_intro_seen so it doesn't reappear on another device. Null/empty
-- intro_message = no popup for that round.
--
-- Pure addition -- new column + new table, doesn't touch existing data
-- (apart from setting round 9's message at the bottom). rounds already
-- has a manager-write policy (rounds_manager_write), so no new policy is
-- needed for the manager to edit intro_message. Run once in the SQL
-- editor.

alter table rounds add column intro_message text;

create table round_intro_seen (
  user_id uuid not null references users(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, round_id)
);

alter table round_intro_seen enable row level security;

create policy "round_intro_seen_select_own"
  on round_intro_seen for select
  to authenticated
  using (user_id = auth.uid());

create policy "round_intro_seen_insert_own"
  on round_intro_seen for insert
  to authenticated
  with check (user_id = auth.uid());

update rounds set intro_message =
'היי לג׳נד!
מחזור חדש בדרך עם משחקים מישראל, גרמניה, אנגליה, איטליה וארגנטינה.
שלחו את הניחושים שלכם ובואו נראה כמה אתם לא מבינים בכדורגל 😉'
where round_number = 9;
