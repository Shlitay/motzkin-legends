-- Lets a participant delete their own round comment so they can post a
-- fresh one instead (the unique constraint on round_comments still blocks
-- a second comment while the old one exists). Pure addition — new RLS
-- policy only, doesn't touch any existing data. Run once in the SQL editor.

create policy "round_comments_delete_own"
  on round_comments for delete
  to authenticated
  using (user_id = auth.uid());
