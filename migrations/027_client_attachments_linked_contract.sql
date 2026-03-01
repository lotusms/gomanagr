-- Add linked contract to client attachments

ALTER TABLE client_attachments
  ADD COLUMN IF NOT EXISTS linked_contract_id UUID REFERENCES client_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_contract_id ON client_attachments(linked_contract_id);
