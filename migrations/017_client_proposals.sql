-- Client proposals: sales offers/estimates before they become contracts. Same scoping as client_contracts.

CREATE TABLE IF NOT EXISTS client_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  proposal_title TEXT NOT NULL DEFAULT '',
  proposal_number TEXT NOT NULL DEFAULT '',
  date_created DATE,
  date_sent DATE,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  estimated_value TEXT NOT NULL DEFAULT '',
  scope_summary TEXT NOT NULL DEFAULT '',
  included_services_products TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  linked_project TEXT,
  linked_contract_id UUID REFERENCES client_contracts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_proposals_client_id ON client_proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_proposals_org_id ON client_proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_proposals_user_id ON client_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_client_proposals_status ON client_proposals(status);
CREATE INDEX IF NOT EXISTS idx_client_proposals_expiration_date ON client_proposals(expiration_date);
CREATE INDEX IF NOT EXISTS idx_client_proposals_linked_contract ON client_proposals(linked_contract_id);

ALTER TABLE client_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client proposals"
  ON client_proposals FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client proposals"
  ON client_proposals FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client proposals"
  ON client_proposals FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client proposals"
  ON client_proposals FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
