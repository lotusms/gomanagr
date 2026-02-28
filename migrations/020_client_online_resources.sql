-- Client online resources: links, portals, web references. Same scoping as client_contracts.

CREATE TABLE IF NOT EXISTS client_online_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  resource_type TEXT,
  description TEXT NOT NULL DEFAULT '',
  login_email_username TEXT,
  access_instructions TEXT NOT NULL DEFAULT '',
  date_added DATE,
  last_verified_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_online_resources_client_id ON client_online_resources(client_id);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_org_id ON client_online_resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_user_id ON client_online_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_resource_type ON client_online_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_client_online_resources_date_added ON client_online_resources(date_added);

ALTER TABLE client_online_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client online resources"
  ON client_online_resources FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client online resources"
  ON client_online_resources FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client online resources"
  ON client_online_resources FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client online resources"
  ON client_online_resources FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
