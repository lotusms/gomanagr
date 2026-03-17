/**
 * Provider registry: resolve active provider by channel, validate, get capabilities.
 */

import { MARKETING_CHANNELS, PROVIDER_TYPES } from './types.js';
import * as mailchimp from './adapters/mailchimp.js';
import * as twilio from './adapters/twilio.js';
import * as resend from './adapters/resend.js';
import { getMarketingSettings } from './marketingSettingsService.js';

const ADAPTERS = {
  [PROVIDER_TYPES.MAILCHIMP]: mailchimp,
  [PROVIDER_TYPES.TWILIO]: twilio,
  [PROVIDER_TYPES.RESEND]: resend,
};

/**
 * @param {string} providerType
 * @returns {{ validateConfig: Function, getCapabilities: Function, getProviderStatus: Function, sendCampaign: Function, sendTestMessage: Function, mapProviderError: Function }|null}
 */
function getAdapter(providerType) {
  return ADAPTERS[providerType] || null;
}

/**
 * @param {'email'|'sms'} channel
 * @param {string} [userId] - When provided, load settings from API (includes org integrations: Mailchimp, Resend from Settings > Integrations).
 * @returns {Promise<{ provider: import('./types').MarketingProviderConfig, adapter: object }|null>}
 */
export async function getActiveProviderForChannel(channel, userId) {
  const settings = await getMarketingSettings(userId);
  const defaultKey = channel === MARKETING_CHANNELS.EMAIL
    ? settings.defaultEmailProvider
    : settings.defaultSmsProvider;
  let config = defaultKey
    ? settings.providers.find((p) => p.providerType === defaultKey)
    : null;
  if (!config && channel === MARKETING_CHANNELS.EMAIL) {
    const emailProvider = settings.providers.find(
      (p) => (p.providerType === PROVIDER_TYPES.MAILCHIMP || p.providerType === PROVIDER_TYPES.RESEND) && p.enabled
    );
    if (emailProvider) config = emailProvider;
  }
  if (!config && channel === MARKETING_CHANNELS.SMS) {
    const smsProvider = settings.providers.find(
      (p) => p.providerType === PROVIDER_TYPES.TWILIO && p.enabled
    );
    if (smsProvider) config = smsProvider;
  }
  if (!config || !config.enabled) return null;
  const adapter = getAdapter(config.providerType);
  if (!adapter) return null;
  const caps = adapter.getCapabilities(config);
  if (channel === MARKETING_CHANNELS.EMAIL && !caps.email) return null;
  if (channel === MARKETING_CHANNELS.SMS && !caps.sms) return null;
  return { provider: config, adapter };
}

/**
 * @param {import('./types').MarketingProviderConfig} config
 * @returns {Promise<import('./types').ProviderValidationResult>}
 */
export async function validateProviderConfig(config) {
  const adapter = getAdapter(config.providerType);
  if (!adapter) return { valid: false, status: 'misconfigured', message: 'Unknown provider' };
  return adapter.validateConfig(config);
}

/**
 * @param {import('./types').MarketingProviderConfig} config
 * @returns {{ email: boolean, sms: boolean }}
 */
export function getProviderCapabilities(config) {
  const adapter = getAdapter(config.providerType);
  if (!adapter) return { email: false, sms: false };
  return adapter.getCapabilities(config);
}

/**
 * @param {import('./types').MarketingProviderConfig} config
 * @returns {Promise<{ status: string, message?: string }>}
 */
export async function getProviderStatus(config) {
  const adapter = getAdapter(config.providerType);
  if (!adapter) return { status: 'not_connected', message: 'Unknown provider' };
  return adapter.getProviderStatus(config);
}

/**
 * Send campaign via the configured provider for the channel.
 * @param {'email'|'sms'} channel
 * @param {{ subject?: string, body: string, recipients: import('./types').CampaignRecipient[] }} payload
 * @param {string} [userId] - When provided, use org-aware provider config (e.g. Mailchimp/Resend from Integrations).
 * @returns {Promise<import('./types').ProviderSendResult>}
 */
export async function sendCampaign(channel, payload, userId) {
  const active = await getActiveProviderForChannel(channel, userId);
  if (!active) {
    return {
      success: false,
      error: channel === MARKETING_CHANNELS.EMAIL
        ? 'No email provider configured or enabled.'
        : 'No SMS provider configured or enabled.',
    };
  }
  return active.adapter.sendCampaign(active.provider, channel, payload);
}

/**
 * Send test message via the active provider for the channel.
 * @param {'email'|'sms'} channel
 * @param {import('./types').TestMessageRequest} request
 * @param {string} [userId] - When provided, use org-aware provider config.
 * @returns {Promise<import('./types').ProviderSendResult>}
 */
export async function sendTestMessage(channel, request, userId) {
  const active = await getActiveProviderForChannel(channel, userId);
  if (!active) {
    return {
      success: false,
      error: channel === MARKETING_CHANNELS.EMAIL
        ? 'No email provider configured.'
        : 'No SMS provider configured.',
    };
  }
  return active.adapter.sendTestMessage(active.provider, request);
}

export const PROVIDER_DISPLAY_NAMES = {
  [PROVIDER_TYPES.MAILCHIMP]: 'Mailchimp',
  [PROVIDER_TYPES.TWILIO]: 'Twilio',
  [PROVIDER_TYPES.RESEND]: 'Resend',
  [PROVIDER_TYPES.SES]: 'Amazon SES',
};
