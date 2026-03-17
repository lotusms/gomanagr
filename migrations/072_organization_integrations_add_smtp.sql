-- Allow SMTP as a provider in organization_integrations (same table as Stripe, Mailchimp, etc.).
-- The app already saves SMTP here; the previous CHECK only allowed stripe, twilio, mailchimp, resend.

ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_provider_check;
ALTER TABLE organization_integrations ADD CONSTRAINT organization_integrations_provider_check
  CHECK (provider IN ('stripe', 'twilio', 'mailchimp', 'resend', 'smtp'));

COMMENT ON TABLE organization_integrations IS 'Per-org third-party integration credentials (encrypted). Provider: stripe, twilio, mailchimp, resend, smtp.';
