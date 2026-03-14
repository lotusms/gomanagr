/**
 * Provider registry: display names, descriptions, required fields for UI and validation.
 * Used by Settings/Integrations and onboarding.
 */

import { PROVIDERS } from './types.js';

const MASK = '••••••••••••';

/**
 * Human-readable provider metadata for UI cards.
 */
const PROVIDER_META = Object.freeze({
  stripe: {
    name: 'Stripe',
    description: 'Accept payments and manage invoices. Enter your Stripe API keys from the Stripe Dashboard.',
    icon: 'credit-card',
    fields: [
      { key: 'publishableKey', label: 'Publishable key', placeholder: 'pk_live_...', mask: true, prefix: 'pk_' },
      { key: 'secretKey', label: 'Secret key', placeholder: 'sk_live_...', mask: true, secret: true, prefix: 'sk_' },
      { key: 'webhookSecret', label: 'Webhook secret (optional)', placeholder: 'whsec_...', mask: true, secret: true, optional: true, prefix: 'whsec_' },
      { key: 'paymentMethodConfigId', label: 'Payment method configuration ID (optional)', placeholder: '', optional: true },
    ],
  },
  twilio: {
    name: 'Twilio',
    description: 'Send SMS. Configure with your Twilio Account SID, Auth Token, and a Twilio phone number.',
    icon: 'chat',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'AC...', mask: true, prefix: 'AC' },
      { key: 'authToken', label: 'Auth Token', placeholder: '...', mask: true, secret: true },
      { key: 'fromNumber', label: 'From phone number', placeholder: '+1234567890', mask: false },
    ],
  },
  mailchimp: {
    name: 'Mailchimp',
    description: 'Email and optionally SMS via Mailchimp. Add your API key and server prefix from Mailchimp.',
    icon: 'mail',
    fields: [
      { key: 'apiKey', label: 'API key', placeholder: '...', mask: true, secret: true },
      { key: 'serverPrefix', label: 'Server prefix (e.g. us21)', placeholder: 'us21', mask: false },
      { key: 'senderEmail', label: 'Sender email', placeholder: 'noreply@yourdomain.com', mask: false },
      { key: 'senderName', label: 'Sender name', placeholder: 'Your Company', mask: false },
      { key: 'fromNumber', label: 'From number (SMS, optional)', placeholder: '', mask: false, optional: true },
      { key: 'smsEnabled', label: 'SMS enabled', type: 'boolean', optional: true },
    ],
  },
  resend: {
    name: 'Resend',
    description: 'Send transactional email. Add your Resend API key and verify your sender domain in Resend.',
    icon: 'mail',
    fields: [
      { key: 'apiKey', label: 'API key', placeholder: 're_...', mask: true, secret: true, prefix: 're_' },
      { key: 'senderEmail', label: 'Sender email', placeholder: 'onboarding@resend.dev', mask: false },
      { key: 'senderName', label: 'Sender name', placeholder: 'Your Company', mask: false },
    ],
  },
});

/**
 * Mask a secret for display (e.g. "sk_live_••••••••••••").
 */
function maskSecret(value, prefixLen = 7) {
  if (!value || typeof value !== 'string') return null;
  const t = value.trim();
  if (!t.length) return null;
  if (t.length <= prefixLen) return MASK;
  return t.slice(0, prefixLen) + MASK;
}

/**
 * Get provider metadata for a provider type.
 */
function getProviderMeta(provider) {
  return PROVIDER_META[provider] || null;
}

/**
 * List all providers for UI (e.g. integration cards).
 */
function listProviders() {
  return PROVIDERS.map((p) => ({ provider: p, ...PROVIDER_META[p] }));
}

export {
  PROVIDER_META,
  MASK,
  maskSecret,
  getProviderMeta,
  listProviders,
};
