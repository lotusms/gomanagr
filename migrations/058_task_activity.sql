-- Task activity log: status changes, assignee changes, due date changes, links, creation.
-- Enables "enterprise-grade" activity feed per task.

CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'status', 'assignee', 'due_at', 'link', 'title', 'priority')),
  old_value TEXT,
  new_value TEXT,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON task_activity(created_at DESC);

ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task activity in their org"
  ON task_activity FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert task activity in their org"
  ON task_activity FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );
