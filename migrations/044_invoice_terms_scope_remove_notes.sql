-- Invoices: add terms and scope_summary; remove notes (replaced by terms).

ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS scope_summary TEXT DEFAULT '';

COMMENT ON COLUMN client_invoices.terms IS 'Invoice terms and conditions (prepopulated from proposal when linked)';
COMMENT ON COLUMN client_invoices.scope_summary IS 'Scope description (prepopulated from proposal when linked)';

-- Migrate existing notes into terms before dropping
UPDATE client_invoices SET terms = COALESCE(notes, '') WHERE terms = '' OR terms IS NULL;

ALTER TABLE client_invoices
  DROP COLUMN IF EXISTS notes;
