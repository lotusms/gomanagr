-- Per-user time entries for timesheets (org-scoped; RLS: own rows + org membership).
CREATE TABLE IF NOT EXISTS public.org_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC(10, 2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  entry_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (entry_method IN ('manual', 'timer', 'clock')),
  billable BOOLEAN NOT NULL DEFAULT true,
  costable BOOLEAN NOT NULL DEFAULT true,
  linked_entity_type TEXT,
  linked_entity_id TEXT,
  linked_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_time_entries_org_user_date
  ON public.org_time_entries(organization_id, user_id, work_date);

COMMENT ON TABLE public.org_time_entries IS 'Timesheet lines: hours per user per day with optional link to client/project/task.';

ALTER TABLE public.org_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view own time entries" ON public.org_time_entries;
CREATE POLICY "Org members can view own time entries"
  ON public.org_time_entries FOR SELECT
  USING (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can insert own time entries" ON public.org_time_entries;
CREATE POLICY "Org members can insert own time entries"
  ON public.org_time_entries FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can update own time entries" ON public.org_time_entries;
CREATE POLICY "Org members can update own time entries"
  ON public.org_time_entries FOR UPDATE
  USING (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org members can delete own time entries" ON public.org_time_entries;
CREATE POLICY "Org members can delete own time entries"
  ON public.org_time_entries FOR DELETE
  USING (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.org_members WHERE user_id = auth.uid())
  );
