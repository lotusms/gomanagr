-- Client contracts: full contract records per client. Same scoping as other client_* tables.

CREATE TABLE IF NOT EXISTS client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contract_title TEXT NOT NULL DEFAULT '',
  contract_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'terminated')),
  contract_type TEXT
    CHECK (contract_type IS NULL OR contract_type IN (
      'service_agreement', 'retainer_agreement', 'maintenance_agreement', 'nda', 'vendor_agreement'
    )),
  effective_date DATE,
  start_date DATE,
  end_date DATE,
  renewal_date DATE,
  contract_value TEXT NOT NULL DEFAULT '',
  scope_summary TEXT NOT NULL DEFAULT '',
  signed_by TEXT NOT NULL DEFAULT '',
  signed_date DATE,
  file_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_contracts_client_id ON client_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_org_id ON client_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_user_id ON client_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_status ON client_contracts(status);
CREATE INDEX IF NOT EXISTS idx_client_contracts_effective_date ON client_contracts(effective_date);

ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client contracts"
  ON client_contracts FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client contracts"
  ON client_contracts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client contracts"
  ON client_contracts FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client contracts"
  ON client_contracts FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
