-- Per-organization API settings (Stripe, marketing). Each org can have its own keys.
-- Global fallback: organization_id = sentinel UUID (no FK). Existing rows become global.

-- Sentinel for "platform/global" config (no org). Not a real organization.
-- Use this when resolving config and no org is specified, or as fallback when org has no row.
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Drop old PK and add composite PK so (organization_id, key) is unique per org
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE app_settings ADD PRIMARY KEY (organization_id, key);

CREATE INDEX IF NOT EXISTS idx_app_settings_org_id ON app_settings(organization_id);

COMMENT ON TABLE app_settings IS 'API and integration settings per organization (Stripe, marketing). organization_id = 00000000-0000-0000-0000-000000000000 for global/fallback.';
