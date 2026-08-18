-- Adds the manager-managed news ticker shown on every participant page.
-- Singleton row (exactly one, ever) with 3 fixed text slots the manager
-- overwrites directly from the admin panel — not a list, no add/delete.
-- Pure addition — new table only, doesn't touch any existing data.
-- Run once in the SQL editor.

create table news_strip (
  id int primary key default 1 check (id = 1),
  slot_1 text,
  slot_2 text,
  slot_3 text,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

insert into news_strip (id) values (1);

alter table news_strip enable row level security;

create policy "news_strip_select_all"
  on news_strip for select
  to authenticated
  using (true);

create policy "news_strip_manager_write"
  on news_strip for update
  to authenticated
  using (is_manager())
  with check (is_manager());
