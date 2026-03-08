-- Tasks: org-scoped work items with optional links to client/project/invoice/proposal/appointment.
-- Status workflow: backlog → to_do → in_progress → blocked → done.
-- position (per status) enables Kanban drag-and-drop ordering.

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL,
  client_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'to_do'
    CHECK (status IN ('backlog', 'to_do', 'in_progress', 'blocked', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  position DOUBLE PRECISION,
  labels JSONB DEFAULT '[]',
  linked_client_id TEXT,
  linked_project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL,
  linked_invoice_id UUID REFERENCES client_invoices(id) ON DELETE SET NULL,
  linked_proposal_id UUID REFERENCES client_proposals(id) ON DELETE SET NULL,
  linked_appointment_id TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status_position ON tasks(status, position NULLS LAST);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their org"
  ON tasks FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert tasks in their org"
  ON tasks FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update tasks in their org"
  ON tasks FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks in their org"
  ON tasks FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );
