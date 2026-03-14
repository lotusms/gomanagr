-- Revert per-org app_settings (069) back to single global config.
-- Run this if you previously applied 069_app_settings_per_org.sql.
-- Safe to run even if 069 was never applied (no-op for column/index).

-- 1. Drop existing primary key (from 068 or 069)
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;

-- 2. If organization_id column exists (069 was applied), keep only global rows and drop column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'app_settings' AND column_name = 'organization_id'
  ) THEN
    DELETE FROM app_settings
    WHERE organization_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000000';
    ALTER TABLE app_settings DROP COLUMN organization_id;
  END IF;
END $$;

-- 3. Restore primary key on key
ALTER TABLE app_settings ADD PRIMARY KEY (key);

-- 4. Drop per-org index if present
DROP INDEX IF EXISTS idx_app_settings_org_id;

COMMENT ON TABLE app_settings IS 'Global app configuration (Stripe, etc.). Read/write via API with role check.';
