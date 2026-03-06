-- Contracts: drop effective_date and renewal_date; update status enum; add related_project_id.

-- Drop columns no longer used
ALTER TABLE client_contracts DROP COLUMN IF EXISTS effective_date;
ALTER TABLE client_contracts DROP COLUMN IF EXISTS renewal_date;

-- Update status constraint: draft, active, inactive, completed, abandoned
ALTER TABLE client_contracts DROP CONSTRAINT IF EXISTS client_contracts_status_check;
ALTER TABLE client_contracts ADD CONSTRAINT client_contracts_status_check
  CHECK (status IN ('draft', 'active', 'inactive', 'completed', 'abandoned'));

-- Default status to draft for existing rows that may have old values
UPDATE client_contracts
SET status = 'draft'
WHERE status NOT IN ('draft', 'active', 'inactive', 'completed', 'abandoned');

-- Link to a client project (optional)
ALTER TABLE client_contracts
  ADD COLUMN IF NOT EXISTS related_project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_contracts_related_project_id ON client_contracts(related_project_id);
