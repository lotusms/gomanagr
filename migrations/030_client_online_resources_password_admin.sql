-- Add related password and admin access flag to client online resources.

ALTER TABLE client_online_resources
  ADD COLUMN IF NOT EXISTS related_password TEXT,
  ADD COLUMN IF NOT EXISTS has_admin_access BOOLEAN NOT NULL DEFAULT false;
