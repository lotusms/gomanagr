-- Add superadmin role for org owner (single role value in existing role column).
-- superadmin = organization owner (only one per org); admin = promoted admin; member = regular.

-- Allow 'superadmin' in the role check constraint (drop existing, add new).
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE public.org_members ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('superadmin', 'admin', 'developer', 'member'));

-- Migrate existing data: set the first admin per organization to superadmin (org creator heuristic).
UPDATE public.org_members om
SET role = 'superadmin', updated_at = now()
FROM (
  SELECT organization_id, MIN(created_at) AS min_created
  FROM public.org_members
  WHERE role = 'admin'
  GROUP BY organization_id
) first_per_org
WHERE om.organization_id = first_per_org.organization_id
  AND om.created_at = first_per_org.min_created
  AND om.role = 'admin';
