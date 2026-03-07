-- Add alt logo URL to organizations (e.g. for dark/light or secondary branding).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS alt_logo_url TEXT;

COMMENT ON COLUMN organizations.alt_logo_url IS 'Optional alternate logo URL (e.g. for dark mode or secondary branding).';
