/**
 * Resolve Stripe config: per-org from organization_integrations (encrypted) or global from app_settings/env.
 * Use in API routes and getServerSideProps. Never expose secretKey/webhookSecret to client.
 * When organizationId is provided: try org integration first; if org has no valid config (e.g. no secretKey), fall back to global so existing behavior is preserved.
 */

import { createClient } from '@supabase/supabase-js';
import { getOrgIntegration, getOrgIntegrationSummary } from '@/lib/integrations/get-org-integration';

let supabaseAdmin;
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

const STRIPE_KEY = 'stripe';
const MASK = '••••••••••••';

/**
 * Get global Stripe config from app_settings + env. Used when no org or as fallback.
 * @returns {Promise<{ publishableKey: string, secretKey: string, webhookSecret: string, paymentMethodConfigId: string }>}
 */
async function getGlobalStripeConfig() {
  const fromEnv = {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || '',
    secretKey: process.env.STRIPE_SECRET_KEY?.trim() || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || '',
    paymentMethodConfigId: process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID?.trim() || '',
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return fromEnv;

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', STRIPE_KEY)
      .maybeSingle();

    if (error || !data?.value || typeof data.value !== 'object') return fromEnv;

    const v = data.value;
    return {
      publishableKey: (v.publishableKey != null && String(v.publishableKey).trim()) || fromEnv.publishableKey,
      secretKey: (v.secretKey != null && String(v.secretKey).trim()) || fromEnv.secretKey,
      webhookSecret: (v.webhookSecret != null && String(v.webhookSecret).trim()) || fromEnv.webhookSecret,
      paymentMethodConfigId: (v.paymentMethodConfigId != null && String(v.paymentMethodConfigId).trim()) || fromEnv.paymentMethodConfigId,
    };
  } catch (_) {
    return fromEnv;
  }
}

/**
 * Get Stripe config. When organizationId is provided: use org integration if it has valid config (secretKey); otherwise fall back to global so payments keep working.
 * @param {string|null|undefined} [organizationId]
 * @returns {Promise<{ publishableKey: string, secretKey: string, webhookSecret: string, paymentMethodConfigId: string }>}
 */
export async function getStripeConfig(organizationId) {
  if (organizationId && String(organizationId).trim()) {
    const org = await getOrgIntegration(String(organizationId).trim(), 'stripe');
    if (org && org.config) {
      const c = org.config;
      const secretKey = (c.secretKey != null && String(c.secretKey).trim()) || '';
      if (secretKey && secretKey.startsWith('sk_')) {
        return {
          publishableKey: (c.publishableKey != null && String(c.publishableKey).trim()) || '',
          secretKey,
          webhookSecret: (c.webhookSecret != null && String(c.webhookSecret).trim()) || '',
          paymentMethodConfigId: (c.paymentMethodConfigId != null && String(c.paymentMethodConfigId).trim()) || '',
        };
      }
    }
    return getGlobalStripeConfig();
  }
  return getGlobalStripeConfig();
}

/**
 * For Settings UI: return config with secrets masked. When organizationId is set, returns that org's integration summary + masked fields only.
 * @param {string|null|undefined} [organizationId]
 */
export async function getStripeConfigForSettings(organizationId) {
  if (organizationId && String(organizationId).trim()) {
    const summary = await getOrgIntegrationSummary(String(organizationId).trim(), 'stripe');
    const org = await getOrgIntegration(String(organizationId).trim(), 'stripe');
    const c = org?.config || {};
    return {
      source: 'organization',
      status: summary?.status || 'pending',
      publishableKey: (c.publishableKey != null && String(c.publishableKey).trim()) || '',
      secretKeyMasked: (c.secretKey && String(c.secretKey).trim()) ? `${String(c.secretKey).slice(0, 7)}${MASK}` : null,
      webhookSecretMasked: (c.webhookSecret && String(c.webhookSecret).trim()) ? `${String(c.webhookSecret).slice(0, 8)}${MASK}` : null,
      paymentMethodConfigId: (c.paymentMethodConfigId != null && String(c.paymentMethodConfigId).trim()) || '',
    };
  }
  const c = await getStripeConfig();
  return {
    source: 'global',
    publishableKey: c.publishableKey,
    secretKeyMasked: c.secretKey ? `${c.secretKey.slice(0, 7)}${MASK}` : null,
    webhookSecretMasked: c.webhookSecret ? `${c.webhookSecret.slice(0, 8)}${MASK}` : null,
    paymentMethodConfigId: c.paymentMethodConfigId,
  };
}

/**
 * Save Stripe config to DB. Only call from authenticated API with owner/developer check.
 * @param { { publishableKey?: string, secretKey?: string, webhookSecret?: string, paymentMethodConfigId?: string } } updates
 * @param { { publishableKey: string, secretKey: string, webhookSecret: string, paymentMethodConfigId: string } } current
 */
export async function saveStripeConfig(updates, current) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Service unavailable' };

  const next = {
    publishableKey: updates.publishableKey !== undefined ? String(updates.publishableKey).trim() : current.publishableKey,
    secretKey: updates.secretKey !== undefined ? String(updates.secretKey).trim() : current.secretKey,
    webhookSecret: updates.webhookSecret !== undefined ? String(updates.webhookSecret).trim() : current.webhookSecret,
    paymentMethodConfigId: updates.paymentMethodConfigId !== undefined ? String(updates.paymentMethodConfigId).trim() : current.paymentMethodConfigId,
  };

  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: STRIPE_KEY, value: next, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e?.message || 'Failed to save' };
  }
}
