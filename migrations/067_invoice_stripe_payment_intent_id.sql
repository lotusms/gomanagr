-- Store Stripe PaymentIntent id so we can reuse the same intent when the pay page is opened
-- multiple times (avoids creating a new "Incomplete" transaction in Stripe on every view).
ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;

COMMENT ON COLUMN client_invoices.stripe_payment_intent_id IS 'Stripe PaymentIntent id; reused for pay page so we do not create a new incomplete on each view';
