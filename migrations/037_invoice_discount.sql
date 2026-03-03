-- Add discount to client_invoices (total = subtotal + tax - discount).
ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS discount TEXT NOT NULL DEFAULT '';
