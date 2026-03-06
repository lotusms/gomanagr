-- Add audit columns to backup_exports if missing (fixes "column checksum does not exist").
-- Safe to run multiple times.

ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS row_counts JSONB;
ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS checksum TEXT;

COMMENT ON COLUMN public.backup_exports.checksum IS 'Optional SHA-256 hash of the exported JSON for integrity verification.';
