-- org_work_shift_patterns INSERT uses check_user_org_admin(organization_id).
-- Migration 004 defined that helper with role IN ('admin', 'developer') only.
-- The app stores org owners as 'superadmin'; they failed WITH CHECK until this fix.

CREATE OR REPLACE FUNCTION public.check_user_org_admin(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE organization_id = org_id
      AND user_id = check_user_id
      AND role IN ('superadmin', 'admin', 'developer')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_org_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_org_admin(UUID, UUID) TO service_role;
