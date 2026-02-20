-- Migration: Fix infinite recursion in org_members RLS policies
-- The issue: Policies were checking org_members within org_members, causing infinite recursion
-- Solution: Use a simpler approach that doesn't cause recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view org members" ON org_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON org_members;

-- Policy: Users can view org_members where they are a member themselves
-- This allows users to see their own membership record
CREATE POLICY "Users can view their own membership"
  ON org_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can view other members in organizations they belong to
-- We check this by seeing if there's ANY org_member record for this user in the same org
-- Using a lateral join approach to avoid recursion detection
CREATE POLICY "Users can view members in their organizations"
  ON org_members FOR SELECT
  USING (
    -- Check if current user is a member of this organization
    -- by checking if there exists a row where user_id matches and organization_id matches
    organization_id IN (
      SELECT om.organization_id 
      FROM org_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Actually, the above still causes recursion. Let's use a different approach:
-- Allow users to see members in organizations they can view (via organizations table policy)
-- But we need to be careful here.

-- Better approach: Use a function that bypasses RLS for the check
CREATE OR REPLACE FUNCTION check_user_org_membership(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- This function runs with SECURITY DEFINER, so it bypasses RLS
  -- We can safely query org_members here
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = org_id
    AND user_id = check_user_id
  );
END;
$$;

-- Drop the previous policy and recreate with function
DROP POLICY IF EXISTS "Users can view members in their organizations" ON org_members;

CREATE POLICY "Users can view members in their organizations"
  ON org_members FOR SELECT
  USING (check_user_org_membership(organization_id));

-- Helper function to check if user is admin/developer in an organization
CREATE OR REPLACE FUNCTION check_user_org_admin(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = org_id
    AND user_id = check_user_id
    AND role IN ('admin', 'developer')
  );
END;
$$;

-- Policy: Only admins and developers can insert/update/delete org members
CREATE POLICY "Admins can insert org members"
  ON org_members FOR INSERT
  WITH CHECK (check_user_org_admin(organization_id));

CREATE POLICY "Admins can update org members"
  ON org_members FOR UPDATE
  USING (check_user_org_admin(organization_id));

CREATE POLICY "Admins can delete org members"
  ON org_members FOR DELETE
  USING (check_user_org_admin(organization_id));
