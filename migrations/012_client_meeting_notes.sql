-- Migration: Client meeting notes table. Same scoping as other client_* tables.

CREATE TABLE IF NOT EXISTS client_meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  meeting_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attendees TEXT NOT NULL DEFAULT '',
  location_zoom_link TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  decisions_made TEXT NOT NULL DEFAULT '',
  action_items TEXT NOT NULL DEFAULT '',
  next_meeting_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_client_id ON client_meeting_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_org_id ON client_meeting_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_user_id ON client_meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_notes_meeting_at ON client_meeting_notes(meeting_at);

ALTER TABLE client_meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client meeting notes"
  ON client_meeting_notes FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client meeting notes"
  ON client_meeting_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client meeting notes"
  ON client_meeting_notes FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client meeting notes"
  ON client_meeting_notes FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
