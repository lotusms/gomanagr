-- Add human-readable task ID (e.g. ORG-TASK-20250303-001) per org nomenclature.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_number TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON tasks(task_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_org_task_number ON tasks(organization_id, task_number) WHERE task_number IS NOT NULL;
