-- Optional subtasks (checklist) per task. Stored as JSONB array: [{ id, title, completed }, ...]

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]';
