-- Add business hours and locations to organizations so all Organization Settings
-- form fields are stored at the org level.
-- Form fields: business hours start/end, locations (HQ + additional).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_hours_start TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS business_hours_end TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN organizations.business_hours_start IS 'Business hours start (e.g. 08:00)';
COMMENT ON COLUMN organizations.business_hours_end IS 'Business hours end (e.g. 18:00)';
COMMENT ON COLUMN organizations.locations IS 'Array of location objects: { address, address2?, city?, state?, postalCode?, country? }';
