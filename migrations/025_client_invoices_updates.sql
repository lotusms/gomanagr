-- Invoices: multiple files, notes, linked contract; remove related_service.

ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS linked_contract_id UUID REFERENCES client_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_invoices_linked_contract ON client_invoices(linked_contract_id);

ALTER TABLE client_invoices
  DROP COLUMN IF EXISTS related_service;
