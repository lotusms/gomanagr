-- Migration: Remove summary column from client_emails (no longer used in UI).

ALTER TABLE client_emails DROP COLUMN IF EXISTS summary;
