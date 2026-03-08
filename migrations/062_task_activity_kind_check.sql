-- task_activity.kind: allow client and project (no link/client_link/project_link).

ALTER TABLE task_activity DROP CONSTRAINT IF EXISTS task_activity_kind_check;

ALTER TABLE task_activity ADD CONSTRAINT task_activity_kind_check
  CHECK (kind IN ('created', 'status', 'assignee', 'due_at', 'title', 'priority', 'client', 'project'));
