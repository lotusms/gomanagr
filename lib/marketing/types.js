/**
 * Marketing module types: provider abstraction, campaign, and config.
 * JSDoc types for scalability; backend can mirror these.
 *
 * @typedef {'sms' | 'email'} MarketingChannel
 * @typedef {'mailchimp' | 'twilio' | 'ses' | 'resend'} ProviderType
 * @typedef {'clients' | 'team'} RecipientGroup
 * @typedef {'all' | 'selected'} AudienceMode
 * @typedef {'draft' | 'queued' | 'sent' | 'failed'} CampaignStatus
 *
 * @typedef {Object} ProviderCapabilities
 * @property {boolean} email
 * @property {boolean} sms
 *
 * @typedef {Object} ProviderValidationResult
 * @property {boolean} valid
 * @property {string} [status] - 'connected' | 'not_connected' | 'misconfigured'
 * @property {string} [message]
 *
 * @typedef {Object} ProviderSendResult
 * @property {boolean} success
 * @property {string} [messageId]
 * @property {string} [error]
 * @property {string} [providerErrorCode]
 *
 * @typedef {Object} CampaignRecipient
 * @property {string} id
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [name]
 *
 * @typedef {Object} TestMessageRequest
 * @property {MarketingChannel} channel
 * @property {string} [to] - email or phone
 * @property {string} [subject] - email only
 * @property {string} body
 *
 * @typedef {Object} MarketingProviderConfig
 * @property {ProviderType} providerType
 * @property {boolean} enabled
 * @property {string} [apiKey]
 * @property {string} [apiSecret]
 * @property {string} [senderEmail] - for email providers
 * @property {string} [senderName]
 * @property {string} [fromNumber] - for SMS (e.g. Twilio)
 * @property {boolean} [smsEnabled] - Mailchimp: SMS may require approval/setup
 * @property {string} [notes]
 *
 * @typedef {Object} MarketingSettings
 * @property {string} [defaultEmailProvider] - ProviderType
 * @property {string} [defaultSmsProvider] - ProviderType
 * @property {MarketingProviderConfig[]} providers
 *
 * @typedef {Object} Campaign
 * @property {string} id
 * @property {MarketingChannel} channel
 * @property {ProviderType} [providerType]
 * @property {string} name
 * @property {string} [subject]
 * @property {string} body
 * @property {RecipientGroup} recipientGroup
 * @property {AudienceMode} audienceMode
 * @property {string[]} [selectedRecipientIds]
 * @property {CampaignStatus} status
 * @property {string} [createdAt]
 * @property {string} [sentAt]
 * @property {string} [createdBy]
 * @property {string} [errorMessage]
 * @property {number} [audienceSize]
 */

export const MARKETING_CHANNELS = /** @type {const} */ ({ SMS: 'sms', EMAIL: 'email' });
export const PROVIDER_TYPES = /** @type {const} */ ({
  MAILCHIMP: 'mailchimp',
  TWILIO: 'twilio',
  SES: 'ses',
  RESEND: 'resend',
});
export const RECIPIENT_GROUPS = /** @type {const} */ ({ CLIENTS: 'clients', TEAM: 'team' });
export const AUDIENCE_MODES = /** @type {const} */ ({ ALL: 'all', SELECTED: 'selected' });
export const CAMPAIGN_STATUSES = /** @type {const} */ ({
  DRAFT: 'draft',
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
});

/** Legacy status set for backward compatibility. */
export const CAMPAIGN_STATUSES_LEGACY = /** @type {const} */ ({ DRAFT: 'draft', SENT: 'sent', FAILED: 'failed' });

export const SMS_SEGMENT_LENGTH = 160;
