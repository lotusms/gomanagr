-- Client invoices: client-facing invoice history. Same scoping as client_contracts.

CREATE TABLE IF NOT EXISTS client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL DEFAULT '',
  invoice_title TEXT NOT NULL DEFAULT '',
  amount TEXT NOT NULL DEFAULT '',
  tax TEXT NOT NULL DEFAULT '',
  total TEXT NOT NULL DEFAULT '',
  date_issued DATE,
  due_date DATE,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'overdue', 'paid', 'partially_paid', 'void')),
  payment_method TEXT NOT NULL DEFAULT '',
  outstanding_balance TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  related_proposal_id UUID REFERENCES client_proposals(id) ON DELETE SET NULL,
  related_project TEXT,
  related_service TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_invoices_client_id ON client_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_org_id ON client_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_user_id ON client_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_status ON client_invoices(status);
CREATE INDEX IF NOT EXISTS idx_client_invoices_date_issued ON client_invoices(date_issued);
CREATE INDEX IF NOT EXISTS idx_client_invoices_due_date ON client_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_client_invoices_related_proposal ON client_invoices(related_proposal_id);

ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or org client invoices"
  ON client_invoices FOR SELECT
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can insert own or org client invoices"
  ON client_invoices FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update own or org client invoices"
  ON client_invoices FOR UPDATE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own or org client invoices"
  ON client_invoices FOR DELETE
  USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()))
  );
