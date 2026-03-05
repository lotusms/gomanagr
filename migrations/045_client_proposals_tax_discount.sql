-- Add tax and discount to client_proposals so they show on proposal PDF/email (same as invoices).

ALTER TABLE client_proposals
  ADD COLUMN IF NOT EXISTS tax TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discount TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN client_proposals.tax IS 'Tax/VAT amount (displayed on proposal and when converted to invoice)';
COMMENT ON COLUMN client_proposals.discount IS 'Discount amount (displayed on proposal and when converted to invoice)';
