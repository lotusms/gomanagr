-- Migration: Client messages table
-- Stores message log entries (SMS, Chat, etc.) per client. Same scoping as client_emails.

CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'chat', 'other')) DEFAULT 'other',
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')) DEFAULT 'sent',
  to_from TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_org_id ON client_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_user_id ON client_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_sent_at ON client_messages(sent_at);

ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client messages"
  ON client_messages FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert own or org client messages"
  ON client_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      organization_id IS NULL
      OR organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own or org client messages"
  ON client_messages FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete own or org client messages"
  ON client_messages FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    (organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    ))
  );
