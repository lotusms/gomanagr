-- Client projects: work tied to a client. Same scoping as client_proposals / client_invoices.
-- No Documents & Files section for projects; dashboard-only list and edit.

CREATE TABLE IF NOT EXISTS client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_projects_client_id ON client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_org_id ON client_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_user_id ON client_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON client_projects(status);
CREATE INDEX IF NOT EXISTS idx_client_projects_start_date ON client_projects(start_date);
CREATE INDEX IF NOT EXISTS idx_client_projects_end_date ON client_projects(end_date);

ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client projects"
  ON client_projects FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client projects"
  ON client_projects FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client projects"
  ON client_projects FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client projects"
  ON client_projects FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
