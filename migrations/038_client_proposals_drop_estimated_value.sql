-- Remove estimated_value from client_proposals (no longer used in UI).
ALTER TABLE client_proposals DROP COLUMN IF EXISTS estimated_value;
