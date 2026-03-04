-- Add address, phone, and website columns to organizations so org-level
-- contact info is stored on the org (not only on user profile).
-- Organization Settings form saves: address, address2, city, state, postal_code, country, phone, website.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT;

COMMENT ON COLUMN organizations.address_line_1 IS 'Organization HQ address line 1';
COMMENT ON COLUMN organizations.address_line_2 IS 'Organization HQ address line 2 (apt, suite, etc.)';
COMMENT ON COLUMN organizations.phone IS 'Organization phone number';
COMMENT ON COLUMN organizations.website IS 'Organization website URL';
