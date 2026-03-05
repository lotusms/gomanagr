-- Add payment_terms (form field) and paid_status (DB only for now) to client_invoices.

ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS paid_status TEXT DEFAULT '';

COMMENT ON COLUMN client_invoices.payment_terms IS 'e.g. Net 30, Due on receipt';
COMMENT ON COLUMN client_invoices.paid_status IS 'Paid status (not on form yet)';
