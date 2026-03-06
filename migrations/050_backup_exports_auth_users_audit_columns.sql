-- Fix 049 if already applied: point FKs to auth.users and add audit columns.
-- Safe to run: uses IF EXISTS / DO blocks where needed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Point platform_admins.user_id to auth.users (was user_profiles)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'platform_admins'
    AND constraint_name = 'platform_admins_user_id_fkey'
  ) THEN
    ALTER TABLE public.platform_admins DROP CONSTRAINT platform_admins_user_id_fkey;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- constraint name may differ; ignore
END $$;

DO $$
BEGIN
  ALTER TABLE public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already points to auth.users
END $$;

-- Add created_at to platform_admins if missing
ALTER TABLE public.platform_admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Point backup_exports.user_id to auth.users (was user_profiles)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'backup_exports'
    AND constraint_name = 'backup_exports_user_id_fkey'
  ) THEN
    ALTER TABLE public.backup_exports DROP CONSTRAINT backup_exports_user_id_fkey;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.backup_exports
    ADD CONSTRAINT backup_exports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Audit columns for backup_exports
ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS row_counts JSONB;
ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.backup_exports ADD COLUMN IF NOT EXISTS checksum TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'backup_exports' AND column_name = 'checksum') THEN
    EXECUTE 'COMMENT ON COLUMN public.backup_exports.checksum IS ''Optional SHA-256 hash of the exported JSON for integrity verification.''';
  END IF;
END $$;