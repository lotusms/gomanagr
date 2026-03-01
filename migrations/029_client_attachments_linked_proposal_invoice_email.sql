-- Link client_attachments to proposals, invoices, and emails so files from those sections show in Attachments.

ALTER TABLE client_attachments
  ADD COLUMN IF NOT EXISTS linked_proposal_id UUID REFERENCES client_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_invoice_id UUID REFERENCES client_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_email_id UUID REFERENCES client_emails(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_proposal_id ON client_attachments(linked_proposal_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_invoice_id ON client_attachments(linked_invoice_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_linked_email_id ON client_attachments(linked_email_id);
