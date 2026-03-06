-- Projects can link to a contract (Linked contract field).

ALTER TABLE client_projects
  ADD COLUMN IF NOT EXISTS related_contract_id UUID REFERENCES client_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_projects_related_contract_id ON client_projects(related_contract_id);
