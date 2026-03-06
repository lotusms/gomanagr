-- Projects: rename description to scope_summary; new status set; add project_owner, related_proposal_id, related_project_id, notes, file_urls.

-- Rename Description to Scope summary in DB
ALTER TABLE client_projects RENAME COLUMN description TO scope_summary;

-- Update status constraint: draft, active, inactive, on_hold, completed, abandoned (default draft)
ALTER TABLE client_projects DROP CONSTRAINT IF EXISTS client_projects_status_check;
ALTER TABLE client_projects ALTER COLUMN status SET DEFAULT 'draft';

-- Map existing statuses to new set
UPDATE client_projects SET status = 'draft'   WHERE status = 'planning';
UPDATE client_projects SET status = 'abandoned' WHERE status = 'cancelled';
UPDATE client_projects SET status = 'draft'   WHERE status NOT IN ('draft', 'active', 'inactive', 'on_hold', 'completed', 'abandoned');

ALTER TABLE client_projects ADD CONSTRAINT client_projects_status_check
  CHECK (status IN ('draft', 'active', 'inactive', 'on_hold', 'completed', 'abandoned'));

-- New columns
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS project_owner TEXT NOT NULL DEFAULT '';
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS related_proposal_id UUID REFERENCES client_proposals(id) ON DELETE SET NULL;
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS related_project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE client_projects ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_client_projects_related_proposal_id ON client_projects(related_proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_related_project_id ON client_projects(related_project_id);

-- Link attachments to projects (for Project files in Attachments section)
ALTER TABLE client_attachments ADD COLUMN IF NOT EXISTS linked_project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_project_id ON client_attachments(linked_project_id);
