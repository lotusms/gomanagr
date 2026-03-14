/**
 * Stripe integration: validate credentials and return config for server-side use.
 * Never expose secretKey or webhookSecret to client.
 */

import Stripe from 'stripe';

/**
 * Validate Stripe credentials (optional: list balance or account) and return status.
 * @param {{ publishableKey?: string, secretKey?: string }} config
 * @returns {Promise<{ ok: boolean, error?: string, status: 'connected'|'invalid' }>}
 */
export async function validateStripeConfig(config) {
  const secretKey = config?.secretKey && String(config.secretKey).trim();
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return { ok: false, error: 'Valid secret key (sk_...) is required', status: 'invalid' };
  }
  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' });
    await stripe.balance.retrieve();
    return { ok: true, status: 'connected' };
  } catch (e) {
    const msg = e?.message || 'Stripe API error';
    return { ok: false, error: msg, status: 'invalid' };
  }
}

/**
 * Build metadata for UI (masked key suffix, no secrets).
 */
export function stripeMetadataFromConfig(config) {
  const pk = config?.publishableKey && String(config.publishableKey).trim();
  return {
    publishableKeySuffix: pk ? pk.slice(-4) : null,
  };
}
