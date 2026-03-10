-- Store a snapshot of client (name, email, address) on the invoice when it is sent.
-- Used by the public pay page so customer info is shown even when profile lookup fails.

ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS client_snapshot JSONB DEFAULT NULL;

COMMENT ON COLUMN client_invoices.client_snapshot IS 'Snapshot of bill-to client when invoice was sent: { name, email?, addressLines? }. Used by /pay/[id] page.';
