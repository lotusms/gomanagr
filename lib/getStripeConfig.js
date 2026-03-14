/**
 * Resolve Stripe config from app_settings (DB) with fallback to env.
 * Use in API routes and getServerSideProps. Never expose secretKey/webhookSecret to client.
 */

import { createClient } from '@supabase/supabase-js';

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
 * @returns {Promise<{ publishableKey: string, secretKey: string, webhookSecret: string, paymentMethodConfigId: string }>}
 */
export async function getStripeConfig() {
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
 * For Settings UI: return config with secrets masked. Do not send raw secretKey or webhookSecret.
 * @returns {Promise<{ publishableKey: string, secretKeyMasked: string|null, webhookSecretMasked: string|null, paymentMethodConfigId: string }>}
 */
export async function getStripeConfigForSettings() {
  const c = await getStripeConfig();
  return {
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
