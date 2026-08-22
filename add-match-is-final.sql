-- Tracks whether a match's score is final or still live/in-progress, so
-- participants can be shown "current result" vs. "final result" on
-- /predictions. Pure additive column, defaults false for all existing
-- rows — doesn't touch any existing scores/predictions/points.
-- Run once in the SQL editor, before the two function migrations that
-- reference this column.

alter table matches add column is_final boolean not null default false;
