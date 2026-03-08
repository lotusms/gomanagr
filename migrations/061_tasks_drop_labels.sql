-- Drop labels column from tasks (no longer used).
ALTER TABLE tasks DROP COLUMN IF EXISTS labels;
