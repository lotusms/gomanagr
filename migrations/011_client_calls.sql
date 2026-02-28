-- Migration: Client calls table
-- Stores call log entries per client. Same scoping as client_emails/client_messages.

CREATE TABLE IF NOT EXISTS client_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')) DEFAULT 'outgoing',
  phone_number TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL CHECK (outcome IN ('no_answer', 'left_voicemail', 'resolved', 'follow_up_needed')) DEFAULT 'resolved',
  follow_up_at TIMESTAMPTZ,
  team_member TEXT,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_calls_client_id ON client_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_org_id ON client_calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_user_id ON client_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_client_calls_called_at ON client_calls(called_at);

ALTER TABLE client_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client calls"
  ON client_calls FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert own or org client calls"
  ON client_calls FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      organization_id IS NULL
      OR organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own or org client calls"
  ON client_calls FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete own or org client calls"
  ON client_calls FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );
