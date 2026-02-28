-- Client attachments: general-purpose files (not strictly contracts/proposals/invoices). Same scoping as client_contracts.

CREATE TABLE IF NOT EXISTS client_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  category TEXT,
  description TEXT NOT NULL DEFAULT '',
  upload_date DATE,
  related_item TEXT,
  version TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_attachments_client_id ON client_attachments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_org_id ON client_attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_user_id ON client_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_category ON client_attachments(category);
CREATE INDEX IF NOT EXISTS idx_client_attachments_upload_date ON client_attachments(upload_date);

ALTER TABLE client_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client attachments"
  ON client_attachments FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client attachments"
  ON client_attachments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client attachments"
  ON client_attachments FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client attachments"
  ON client_attachments FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
