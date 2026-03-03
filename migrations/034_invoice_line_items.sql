-- Invoice line items (itemized services/products). Same pattern as proposal_line_items.

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES client_invoices(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  item_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
  unit_price TEXT NOT NULL DEFAULT '',
  amount TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice line items for own or org invoices"
  ON invoice_line_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM client_invoices
      WHERE (organization_id IS NULL AND user_id = auth.uid())
         OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can insert invoice line items for own or org invoices"
  ON invoice_line_items FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM client_invoices
      WHERE user_id = auth.uid()
        AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can update invoice line items for own or org invoices"
  ON invoice_line_items FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM client_invoices
      WHERE (organization_id IS NULL AND user_id = auth.uid())
         OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can delete invoice line items for own or org invoices"
  ON invoice_line_items FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM client_invoices
      WHERE (organization_id IS NULL AND user_id = auth.uid())
         OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );
