-- Store full team member info with the invite so it's available when they accept
-- (firstName, lastName, name, role, company, industry, etc.)
ALTER TABLE org_invites
ADD COLUMN IF NOT EXISTS invitee_data JSONB;

COMMENT ON COLUMN org_invites.invitee_data IS 'Team member snapshot: firstName, lastName, name, role, email, company, industry, etc.';
