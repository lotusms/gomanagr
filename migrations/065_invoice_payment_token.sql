-- Secure token for public payment link. Generated when invoice is sent; validated on /pay/[invoiceId]?token=...
ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS payment_token TEXT DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_invoices_payment_token ON client_invoices(payment_token) WHERE payment_token IS NOT NULL;

COMMENT ON COLUMN client_invoices.payment_token IS 'Token for pay link; required in URL to view/pay invoice publicly';
