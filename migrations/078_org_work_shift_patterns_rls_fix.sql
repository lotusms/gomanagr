-- Fix INSERT/UPDATE RLS on org_work_shift_patterns: policy subqueries using
-- org_work_shift_patterns.user_id may not resolve to the new row in all cases.
-- Use a SECURITY DEFINER helper for the assignee-in-org check.

CREATE OR REPLACE FUNCTION public.check_org_has_member(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE organization_id = p_organization_id AND user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.check_org_has_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_org_has_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_org_has_member(UUID, UUID) TO service_role;

DROP POLICY IF EXISTS "Admins can insert work shift patterns" ON public.org_work_shift_patterns;
CREATE POLICY "Admins can insert work shift patterns"
  ON public.org_work_shift_patterns FOR INSERT
  WITH CHECK (
    public.check_user_org_admin(organization_id)
    AND public.check_org_has_member(organization_id, user_id)
  );

DROP POLICY IF EXISTS "Admins can update work shift patterns" ON public.org_work_shift_patterns;
CREATE POLICY "Admins can update work shift patterns"
  ON public.org_work_shift_patterns FOR UPDATE
  USING (public.check_user_org_admin(organization_id))
  WITH CHECK (
    public.check_user_org_admin(organization_id)
    AND public.check_org_has_member(organization_id, user_id)
  );

-- Table privileges (Supabase API uses authenticated + RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_work_shift_patterns TO authenticated;
