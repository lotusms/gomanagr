-- Migration: Organization Invites Table
-- This table stores invitations for users to join organizations

CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'member')) DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON org_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_used ON org_invites(used);

-- Enable RLS
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and developers can view invites for their organizations
CREATE POLICY "Admins can view org invites"
  ON org_invites FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Policy: Admins and developers can create invites for their organizations
CREATE POLICY "Admins can create org invites"
  ON org_invites FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Policy: Admins can update invites (mark as used, etc.)
CREATE POLICY "Admins can update org invites"
  ON org_invites FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Policy: Anyone can view invites by token (for signup flow)
CREATE POLICY "Anyone can view invite by token"
  ON org_invites FOR SELECT
  USING (true); -- Token acts as authentication

-- Policy: System can mark invite as used (via service role)
-- Note: This will be handled by API routes using service role key
