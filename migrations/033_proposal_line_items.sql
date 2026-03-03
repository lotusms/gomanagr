-- Proposal line items (itemized services/products). Reusable pattern for invoices later.

CREATE TABLE IF NOT EXISTS proposal_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES client_proposals(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  item_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
  unit_price TEXT NOT NULL DEFAULT '',
  amount TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_line_items_proposal_id ON proposal_line_items(proposal_id);

ALTER TABLE proposal_line_items ENABLE ROW LEVEL SECURITY;

-- Users can manage line items for proposals they can access (same as client_proposals).
CREATE POLICY "Users can view proposal line items for own or org proposals"
  ON proposal_line_items FOR SELECT
  USING (
    proposal_id IN (
      SELECT id FROM client_proposals
      WHERE (organization_id IS NULL AND user_id = auth.uid())
         OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can insert proposal line items for own or org proposals"
  ON proposal_line_items FOR INSERT
  WITH CHECK (
    proposal_id IN (
      SELECT id FROM client_proposals
      WHERE user_id = auth.uid()
        AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can update proposal line items for own or org proposals"
  ON proposal_line_items FOR UPDATE
  USING (
    proposal_id IN (
      SELECT id FROM client_proposals
      WHERE (organization_id IS NULL AND user_id = auth.uid())
         OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Users can delete proposal line items for own or org proposals"
  ON proposal_line_items FOR DELETE
  USING (
    proposal_id IN (
      SELECT id FROM client_proposals
      WHERE (organization_id IS NULL AND user_id = auth.uid())
         OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
    )
  );

-- Remove included_services_products; itemization is now in proposal_line_items.
ALTER TABLE client_proposals
  DROP COLUMN IF EXISTS included_services_products;
