-- Per-invoice payment history: one row per successful payment (Stripe PaymentIntent or checkout).
-- Used to show a timeline of payments (e.g. "Paid $50 on 03/17/2026") and supports partial payments.
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES client_invoices(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_payment_intent_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_stripe_pi
  ON invoice_payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_paid_at ON invoice_payments(paid_at);

COMMENT ON TABLE invoice_payments IS 'One row per payment applied to an invoice; used for payment history timeline';

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Users can see payments for invoices they can see (same policy as client_invoices: own or org).
CREATE POLICY "Users can view invoice_payments for own or org invoices"
  ON invoice_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_invoices inv
      WHERE inv.id = invoice_payments.invoice_id
      AND (
        (inv.organization_id IS NULL AND inv.user_id = auth.uid())
        OR (inv.organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
      )
    )
  );

-- Only service role inserts (webhook / sync-invoice-paid); no direct user inserts.
CREATE POLICY "No user insert on invoice_payments"
  ON invoice_payments FOR INSERT WITH CHECK (false);
CREATE POLICY "No user update on invoice_payments"
  ON invoice_payments FOR UPDATE USING (false);
CREATE POLICY "No user delete on invoice_payments"
  ON invoice_payments FOR DELETE USING (false);
