-- Link contracts to a client proposal (optional). Proposals are created in the Proposals section.

ALTER TABLE client_contracts
  ADD COLUMN IF NOT EXISTS related_proposal_id UUID REFERENCES client_proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_contracts_related_proposal_id ON client_contracts(related_proposal_id);
