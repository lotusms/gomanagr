-- Store invoice line items as JSONB on client_invoices instead of a separate table.
-- Each invoice is a single document with its own list; same pattern as proposals.

-- Add column (array of { item_name, description, quantity, unit_price, amount })
ALTER TABLE client_invoices
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill from invoice_line_items (preserve order by sort_order)
UPDATE client_invoices p
SET line_items = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'item_name', li.item_name,
        'description', li.description,
        'quantity', li.quantity,
        'unit_price', li.unit_price,
        'amount', li.amount
      ) ORDER BY li.sort_order
    )
    FROM invoice_line_items li
    WHERE li.invoice_id = p.id
  ),
  '[]'::jsonb
);

-- Remove separate table
DROP TABLE IF EXISTS invoice_line_items;
