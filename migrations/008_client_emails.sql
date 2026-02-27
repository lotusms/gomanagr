-- Migration: Client emails table
-- Stores email log entries per client. Scoped by organization_id (org) or user_id (solo).

CREATE TABLE IF NOT EXISTS client_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')) DEFAULT 'sent',
  to_from TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  related_project_case TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_emails_client_id ON client_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_org_id ON client_emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_user_id ON client_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_sent_at ON client_emails(sent_at);

ALTER TABLE client_emails ENABLE ROW LEVEL SECURITY;

-- Solo: user can only access their own rows (organization_id is null)
-- Org: user can access rows for their organization
CREATE POLICY "Users can view own or org client emails"
  ON client_emails FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert own or org client emails"
  ON client_emails FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      organization_id IS NULL
      OR organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own or org client emails"
  ON client_emails FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete own or org client emails"
  ON client_emails FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );
