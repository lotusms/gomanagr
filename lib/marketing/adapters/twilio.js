/**
 * Mock Twilio adapter: SMS only.
 */

import { MARKETING_CHANNELS } from '../types.js';
import { validationResult, sendResult } from './base.js';

/**
 * @param {import('../types').MarketingProviderConfig} config
 * @returns {Promise<import('../types').ProviderValidationResult>}
 */
export async function validateConfig(config) {
  if (!config.enabled) return validationResult(false, 'not_connected', 'Provider is disabled');
  if (!config.apiKey || !config.apiSecret) {
    return validationResult(false, 'misconfigured', 'Account SID and Auth Token required');
  }
  if (!config.fromNumber) {
    return validationResult(false, 'misconfigured', 'From number required for SMS');
  }
  return validationResult(true, 'connected', 'SMS ready');
}

/**
 * @param {import('../types').MarketingProviderConfig} config
 * @returns {import('../types').ProviderCapabilities}
 */
export function getCapabilities(config) {
  if (!config.enabled) return { email: false, sms: false };
  const ok = !!(config.apiKey && config.apiSecret && config.fromNumber);
  return { email: false, sms: ok };
}

/**
 * @param {import('../types').MarketingProviderConfig} config
 * @returns {Promise<{ status: string, message?: string }>}
 */
export async function getProviderStatus(config) {
  const v = await validateConfig(config);
  return { status: v.status || (v.valid ? 'connected' : 'not_connected'), message: v.message };
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function mapProviderError(err) {
  if (err && typeof err === 'object' && 'message' in err) return String(err.message);
  return 'Twilio request failed';
}

/**
 * @param {import('../types').MarketingProviderConfig} config
 * @param {'email'|'sms'} channel
 * @param {{ subject?: string, body: string, recipients: import('../types').CampaignRecipient[] }} payload
 * @returns {Promise<import('../types').ProviderSendResult>}
 */
export async function sendCampaign(config, channel, payload) {
  if (channel !== MARKETING_CHANNELS.SMS) {
    return sendResult(false, undefined, 'Twilio supports SMS only');
  }
  const v = await validateConfig(config);
  if (!v.valid) return sendResult(false, undefined, v.message);
  await new Promise((r) => setTimeout(r, 300));
  return sendResult(true, `tw_${Date.now()}`);
}

/**
 * @param {import('../types').MarketingProviderConfig} config
 * @param {import('../types').TestMessageRequest} request
 * @returns {Promise<import('../types').ProviderSendResult>}
 */
export async function sendTestMessage(config, request) {
  if (request.channel !== MARKETING_CHANNELS.SMS) {
    return sendResult(false, undefined, 'Twilio supports SMS only');
  }
  const v = await validateConfig(config);
  if (!v.valid) return sendResult(false, undefined, v.message);
  await new Promise((r) => setTimeout(r, 200));
  return sendResult(true, `test_tw_${Date.now()}`);
}

export const providerType = 'twilio';
export const displayName = 'Twilio';
