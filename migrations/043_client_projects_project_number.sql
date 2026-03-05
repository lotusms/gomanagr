-- Add project_number to client_projects for IDs like LOT-PROJ-20260305-001.

ALTER TABLE client_projects
  ADD COLUMN IF NOT EXISTS project_number TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN client_projects.project_number IS 'Display ID e.g. LOT-PROJ-20260305-001';
