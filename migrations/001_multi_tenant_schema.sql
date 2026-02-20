-- Migration: Multi-tenant organization structure
-- This migration creates the new schema for organizations and org_members

-- Step 1: Rename user_account to user_profiles
ALTER TABLE IF EXISTS user_account RENAME TO user_profiles;

-- Step 2: Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  company_size TEXT,
  company_locations TEXT,
  team_size TEXT,
  sections_to_track JSONB DEFAULT '[]'::jsonb,
  trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  selected_palette TEXT DEFAULT 'palette1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create org_members join table
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON org_members(role);

-- Step 5: Migrate existing data (if any exists)
-- This assumes each existing user_account becomes:
-- 1. A user_profile (already renamed)
-- 2. An organization (from company_name)
-- 3. An org_member entry (admin role)

DO $$
DECLARE
  user_record RECORD;
  org_id UUID;
BEGIN
  -- Loop through existing user_profiles
  FOR user_record IN SELECT * FROM user_profiles LOOP
    -- Create organization from user's company data
    INSERT INTO organizations (
      name,
      logo_url,
      industry,
      company_size,
      company_locations,
      team_size,
      sections_to_track,
      trial,
      trial_ends_at,
      selected_palette,
      created_at,
      updated_at
    ) VALUES (
      user_record.company_name,
      user_record.company_logo,
      user_record.industry,
      user_record.company_size,
      user_record.company_locations,
      user_record.team_size,
      COALESCE(user_record.sections_to_track, '[]'::jsonb),
      COALESCE(user_record.trial, true),
      user_record.trial_ends_at,
      COALESCE(user_record.selected_palette, 'palette1'),
      COALESCE(user_record.created_at, NOW()),
      COALESCE(user_record.updated_at, NOW())
    )
    RETURNING id INTO org_id;
    
    -- Create org_member entry (user is admin of their own org)
    INSERT INTO org_members (
      organization_id,
      user_id,
      role,
      created_at,
      updated_at
    ) VALUES (
      org_id,
      user_record.id,
      'admin',
      COALESCE(user_record.created_at, NOW()),
      COALESCE(user_record.updated_at, NOW())
    );
  END LOOP;
END $$;

-- Step 6: Add RLS policies (if using Row Level Security)
-- Note: Adjust these policies based on your security requirements

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can ONLY view organizations they're members of
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins and developers can update organizations
CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Policy: Users can ONLY view org_members for organizations they belong to
CREATE POLICY "Users can view org members"
  ON org_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins and developers can add/remove org members
CREATE POLICY "Admins can manage org members"
  ON org_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM org_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Policy: Prevent users from creating organizations directly (must go through signup API)
CREATE POLICY "Prevent direct org creation"
  ON organizations FOR INSERT
  WITH CHECK (false); -- Block all direct inserts - must use API route

-- Policy: Prevent users from adding themselves to organizations (must use invite)
CREATE POLICY "Prevent self-adding to orgs"
  ON org_members FOR INSERT
  WITH CHECK (false); -- Block all direct inserts - must use invite or API route
