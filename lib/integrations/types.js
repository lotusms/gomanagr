/**
 * Multi-tenant integration types and constants.
 * ProviderType, IntegrationStatus, and config shapes for Stripe/Twilio/Mailchimp/Resend.
 */

/** @typedef {'stripe'|'twilio'|'mailchimp'|'resend'|'smtp'} ProviderType */

/** @typedef {'connected'|'disconnected'|'invalid'|'pending'} IntegrationStatus */

/**
 * @typedef {Object} OrganizationIntegrationRow
 * @property {string} id
 * @property {string} organization_id
 * @property {ProviderType} provider
 * @property {IntegrationStatus} status
 * @property {string|null} config_encrypted
 * @property {Record<string,unknown>} metadata_json
 * @property {string|null} last_validated_at
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} StripeIntegrationConfig
 * @property {string} [publishableKey]
 * @property {string} [secretKey]
 * @property {string} [webhookSecret]
 * @property {string} [paymentMethodConfigId]
 */

/**
 * @typedef {Object} TwilioIntegrationConfig
 * @property {string} [accountSid]
 * @property {string} [authToken]
 * @property {string} [fromNumber]
 */

/**
 * @typedef {Object} MailchimpIntegrationConfig
 * @property {string} [apiKey]
 * @property {string} [serverPrefix]
 * @property {string} [senderEmail]
 * @property {string} [senderName]
 * @property {string} [fromNumber]
 * @property {boolean} [smsEnabled]
 */

/**
 * @typedef {Object} ResendIntegrationConfig
 * @property {string} [apiKey]
 * @property {string} [senderEmail]
 * @property {string} [senderName]
 */

/**
 * @typedef {Object} ProviderValidationResult
 * @property {boolean} ok
 * @property {string} [error]
 * @property {IntegrationStatus} [status]
 */

/**
 * @typedef {Object} MaskedIntegrationSummary
 * @property {string} provider
 * @property {IntegrationStatus} status
 * @property {Record<string,unknown>} metadata
 * @property {string|null} lastValidatedAt
 * @property {Object} maskedConfig - provider-specific masked fields (e.g. publishableKey last 4, no secretKey)
 */

export const PROVIDERS = Object.freeze(['stripe', 'twilio', 'smtp', 'mailchimp', 'resend']);
export const STATUSES = Object.freeze(['connected', 'disconnected', 'invalid', 'pending']);
