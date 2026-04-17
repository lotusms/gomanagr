-- Recurring weekly work hours per org member (not task/appointments; separate from calendar schedule).
-- weekday: 0 = Monday … 6 = Sunday (org-local pattern; not tied to a specific calendar week).
CREATE TABLE IF NOT EXISTS public.org_work_shift_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_work_shift_patterns_time_order CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_org_work_shift_patterns_org_user
  ON public.org_work_shift_patterns(organization_id, user_id);

COMMENT ON TABLE public.org_work_shift_patterns IS 'Weekly work hours template per member (e.g. Mon/Wed 09:00–17:00); admins edit, members read own rows.';

ALTER TABLE public.org_work_shift_patterns ENABLE ROW LEVEL SECURITY;

-- Helper: assignee must be in org_members (SECURITY DEFINER avoids brittle row refs in RLS WITH CHECK).
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

DROP POLICY IF EXISTS "Members and admins can view work shift patterns" ON public.org_work_shift_patterns;
CREATE POLICY "Members and admins can view work shift patterns"
  ON public.org_work_shift_patterns FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
    AND (
      user_id = auth.uid()
      OR public.check_user_org_admin(organization_id)
    )
  );

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

DROP POLICY IF EXISTS "Admins can delete work shift patterns" ON public.org_work_shift_patterns;
CREATE POLICY "Admins can delete work shift patterns"
  ON public.org_work_shift_patterns FOR DELETE
  USING (public.check_user_org_admin(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_work_shift_patterns TO authenticated;
