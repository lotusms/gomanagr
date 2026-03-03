-- Store proposal line items as JSONB on client_proposals instead of a separate table.
-- Each proposal is a single document with its own list; no cross-proposal querying of items.

-- Add column (array of { item_name, description, quantity, unit_price, amount })
ALTER TABLE client_proposals
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill from proposal_line_items (preserve order by sort_order)
UPDATE client_proposals p
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
    FROM proposal_line_items li
    WHERE li.proposal_id = p.id
  ),
  '[]'::jsonb
);

-- Remove separate table
DROP TABLE IF EXISTS proposal_line_items;
