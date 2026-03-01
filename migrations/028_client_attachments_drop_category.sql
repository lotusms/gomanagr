-- Remove category from client_attachments (no longer used in the form)

DROP INDEX IF EXISTS idx_client_attachments_category;

ALTER TABLE client_attachments
  DROP COLUMN IF EXISTS category;
