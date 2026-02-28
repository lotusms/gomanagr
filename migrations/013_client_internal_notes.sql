-- Client internal notes: private notes with optional tag and pin. Same scoping as other client_* tables.

CREATE TABLE IF NOT EXISTS client_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  tag TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT client_internal_notes_tag_check CHECK (tag IS NULL OR tag IN ('reminder', 'warning', 'preference', 'billing', 'issue'))
);

CREATE INDEX IF NOT EXISTS idx_client_internal_notes_client_id ON client_internal_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_org_id ON client_internal_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_user_id ON client_internal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_is_pinned ON client_internal_notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_client_internal_notes_created_at ON client_internal_notes(created_at DESC);

ALTER TABLE client_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client internal notes"
  ON client_internal_notes FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client internal notes"
  ON client_internal_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client internal notes"
  ON client_internal_notes FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client internal notes"
  ON client_internal_notes FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
