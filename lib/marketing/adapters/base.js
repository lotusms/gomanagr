/**
 * Base adapter helpers and JSDoc contracts for marketing providers.
 * Adapters implement validateConfig, getCapabilities, sendCampaign, sendTestMessage, mapProviderError, getProviderStatus.
 */

import { PROVIDER_TYPES, MARKETING_CHANNELS } from '../types.js';

/**
 * @typedef {import('../types').MarketingProviderConfig} MarketingProviderConfig
 * @typedef {import('../types').ProviderCapabilities} ProviderCapabilities
 * @typedef {import('../types').ProviderValidationResult} ProviderValidationResult
 * @typedef {import('../types').ProviderSendResult} ProviderSendResult
 * @typedef {import('../types').CampaignRecipient} CampaignRecipient
 * @typedef {import('../types').TestMessageRequest} TestMessageRequest
 */

/**
 * Create a validation result.
 * @param {boolean} valid
 * @param {'connected'|'not_connected'|'misconfigured'} [status]
 * @param {string} [message]
 * @returns {ProviderValidationResult}
 */
export function validationResult(valid, status, message) {
  return { valid, ...(status && { status }), ...(message && { message }) };
}

/**
 * Create a send result.
 * @param {boolean} success
 * @param {string} [messageId]
 * @param {string} [error]
 * @param {string} [providerErrorCode]
 * @returns {ProviderSendResult}
 */
export function sendResult(success, messageId, error, providerErrorCode) {
  return {
    success,
    ...(messageId && { messageId }),
    ...(error && { error }),
    ...(providerErrorCode && { providerErrorCode }),
  };
}

export { PROVIDER_TYPES, MARKETING_CHANNELS };
