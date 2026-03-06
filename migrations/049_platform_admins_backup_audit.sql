-- Ensure gen_random_uuid() is available (built-in in PG13+; pgcrypto for older)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Platform admins: tied to auth identity (auth.users), not profile table.
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for backup exports. DB stores pointer (file_path); file lives in Storage.
CREATE TABLE IF NOT EXISTS public.backup_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('org', 'master')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_path TEXT,
  row_counts JSONB,
  user_agent TEXT,
  ip_address INET,
  checksum TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_exports_user_exported ON public.backup_exports(user_id, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_exports_org_exported ON public.backup_exports(organization_id, exported_at DESC) WHERE organization_id IS NOT NULL;

COMMENT ON TABLE public.platform_admins IS 'Platform operators; only these users can run master backup. To add one: INSERT INTO platform_admins (user_id) VALUES (''<auth.users.id>''); or use auth.uid() in a secure context.';
COMMENT ON TABLE public.backup_exports IS 'Audit trail for backup exports; used for rate limiting and compliance. file_path points to private Storage (e.g. backups/org/<org_id>/<date>/full.json).';
COMMENT ON COLUMN public.backup_exports.checksum IS 'Optional SHA-256 hash of the exported JSON for integrity verification.';