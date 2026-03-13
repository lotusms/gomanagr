/**
 * Mock Mailchimp adapter: email + optional SMS (SMS depends on account eligibility/approval).
 */

import { PROVIDER_TYPES, MARKETING_CHANNELS } from '../types.js';
import { validationResult, sendResult } from './base.js';

/** @type {import('../types').ProviderCapabilities} */
const BASE_CAPABILITIES = { email: true, sms: false };

/**
 * Validate Mailchimp config. SMS capability is config-dependent.
 * @param {import('../types').MarketingProviderConfig} config
 * @returns {Promise<import('../types').ProviderValidationResult>}
 */
export async function validateConfig(config) {
  if (!config.enabled) return validationResult(false, 'not_connected', 'Provider is disabled');
  if (!config.apiKey || config.apiKey.length < 10) {
    return validationResult(false, 'misconfigured', 'Valid API key required');
  }
  const smsCapable = config.smsEnabled === true && !!config.fromNumber;
  return validationResult(true, 'connected', smsCapable ? 'Email and SMS ready' : 'Email ready; SMS may require approval or setup');
}

/**
 * Get capabilities. SMS only if explicitly enabled and configured.
 * @param {import('../types').MarketingProviderConfig} config
 * @returns {import('../types').ProviderCapabilities}
 */
export function getCapabilities(config) {
  if (!config.enabled) return { email: false, sms: false };
  const smsOk = config.smsEnabled === true && !!config.apiKey;
  return { email: !!config.apiKey, sms: smsOk };
}

/**
 * @param {import('../types').MarketingProviderConfig} config
 * @returns {Promise<{ status: string, message?: string }>}
 */
export async function getProviderStatus(config) {
  const v = await validateConfig(config);
  return {
    status: v.status || (v.valid ? 'connected' : 'not_connected'),
    message: v.message,
  };
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function mapProviderError(err) {
  if (err && typeof err === 'object' && 'message' in err) return String(err.message);
  return 'Mailchimp request failed';
}

/**
 * Mock send campaign (email or SMS).
 * @param {import('../types').MarketingProviderConfig} config
 * @param {'email'|'sms'} channel
 * @param {{ subject?: string, body: string, recipients: import('../types').CampaignRecipient[] }} payload
 * @returns {Promise<import('../types').ProviderSendResult>}
 */
export async function sendCampaign(config, channel, payload) {
  const v = await validateConfig(config);
  if (!v.valid) return sendResult(false, undefined, v.message);
  const caps = getCapabilities(config);
  if (channel === MARKETING_CHANNELS.SMS && !caps.sms) {
    return sendResult(false, undefined, 'Mailchimp SMS is not enabled or not configured for this account');
  }
  if (channel === MARKETING_CHANNELS.EMAIL && !caps.email) {
    return sendResult(false, undefined, 'Email not configured');
  }
  await new Promise((r) => setTimeout(r, 300));
  return sendResult(true, `mc_${Date.now()}`);
}

/**
 * Mock send test message.
 * @param {import('../types').MarketingProviderConfig} config
 * @param {import('../types').TestMessageRequest} request
 * @returns {Promise<import('../types').ProviderSendResult>}
 */
export async function sendTestMessage(config, request) {
  const v = await validateConfig(config);
  if (!v.valid) return sendResult(false, undefined, v.message);
  const caps = getCapabilities(config);
  if (request.channel === MARKETING_CHANNELS.SMS && !caps.sms) {
    return sendResult(false, undefined, 'SMS not available for this Mailchimp account');
  }
  if (request.channel === MARKETING_CHANNELS.EMAIL && !caps.email) {
    return sendResult(false, undefined, 'Email not configured');
  }
  await new Promise((r) => setTimeout(r, 200));
  return sendResult(true, `test_${Date.now()}`);
}

export const providerType = PROVIDER_TYPES.MAILCHIMP;
export const displayName = 'Mailchimp';
