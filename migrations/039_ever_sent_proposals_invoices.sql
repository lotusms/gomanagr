-- Proposals: flag and date when first sent via "Save and Send". Date sent is prepopulated when re-opening.
ALTER TABLE client_proposals
  ADD COLUMN IF NOT EXISTS ever_sent BOOLEAN NOT NULL DEFAULT false;

-- Invoices: same flag and date_sent for when invoice was sent to client.
ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS ever_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_sent DATE;
