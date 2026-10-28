-- Replaces migration 60's per-round rounds.intro_message with a single,
-- persistent popup config the manager edits from /manager -> "הודעת
-- מחזור": title, text, main color (title + text), second color
-- (background), and a show-once checkbox. Every new round re-triggers it
-- automatically for everyone, since "seen" is still tracked per round in
-- round_intro_seen (from migration 60) -- no need to retype the message
-- each round.
--
-- show_once = true: each participant sees it once per round.
-- show_once = false: shown every time they open the app (once per
-- browser session) for as long as the round is running.
--
-- Singleton row, same pattern as news_strip. Seeded from round 9's
-- existing intro_message so nothing visibly changes. rounds.intro_message
-- is left in place, unread. Run once in the SQL editor.

create table round_popup (
  id int primary key default 1 check (id = 1),
  title text,
  body text,
  main_color text not null default '#1b6b3c',
  bg_color text not null default '#ffffff',
  show_once boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into round_popup (id, title, body)
select 1,
  'היי לג׳נד!',
  'מחזור חדש בדרך עם משחקים מישראל, גרמניה, אנגליה, איטליה וארגנטינה.
שלחו את הניחושים שלכם ובואו נראה כמה אתם לא מבינים בכדורגל 😉';

alter table round_popup enable row level security;

create policy "round_popup_select_all"
  on round_popup for select
  to authenticated
  using (true);

create policy "round_popup_manager_write"
  on round_popup for update
  to authenticated
  using (is_manager())
  with check (is_manager());
