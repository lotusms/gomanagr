-- Multi-tenant organization integrations.
-- Stores encrypted third-party provider config per organization (Stripe, Twilio, Mailchimp, Resend).
-- Access via service role only; RBAC enforced in API layer. No RLS on this table.

CREATE TABLE IF NOT EXISTS organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'twilio', 'mailchimp', 'resend')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'disconnected', 'invalid', 'pending')),
  config_encrypted TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_organization_integrations_org ON organization_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_integrations_provider ON organization_integrations(provider);

COMMENT ON TABLE organization_integrations IS 'Per-org third-party integration credentials (encrypted). Provider: stripe, twilio, mailchimp, resend.';
COMMENT ON COLUMN organization_integrations.config_encrypted IS 'AES-256-GCM encrypted JSON of provider-specific credentials. Decrypted server-side only.';
COMMENT ON COLUMN organization_integrations.metadata_json IS 'Non-secret display info: account label, masked key suffix, sender email/phone, etc.';
