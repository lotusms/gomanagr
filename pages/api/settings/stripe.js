/**
 * GET: return Stripe config for Settings UI (secrets masked).
 * POST: save Stripe config. Only superadmin or developer.
 * Body for both: { userId }.
 * POST body also: { publishableKey?, secretKey?, webhookSecret?, paymentMethodConfigId? }
 *
 * SECURITY: Never log req.body or any variable that may contain secretKey, webhookSecret,
 * or other credentials. Secrets are stored in app_settings (Supabase); ensure DB has encryption at rest.
 */

import { createClient } from '@supabase/supabase-js';
import { getStripeConfig, getStripeConfigForSettings, saveStripeConfig } from '@/lib/getStripeConfig';

let supabaseAdmin;
function getAdmin() {
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

async function requireOwnerOrDeveloper(userId) {
  const supabase = getAdmin();
  if (!supabase) return { error: 'Service unavailable', status: 503 };

  const { data: rows, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId);

  if (error) return { error: error.message, status: 500 };
  const allowed = (rows || []).some((r) => r.role === 'superadmin' || r.role === 'developer');
  if (!allowed) return { error: 'Only superadmin or developer can manage Stripe settings', status: 403 };
  return { allowed: true };
}

function validateStripeKeys(updates) {
  if (updates.publishableKey !== undefined) {
    const v = String(updates.publishableKey).trim();
    if (v && !v.startsWith('pk_')) return 'Publishable key must start with pk_';
  }
  if (updates.secretKey !== undefined) {
    const v = String(updates.secretKey).trim();
    if (v && !v.startsWith('sk_')) return 'Secret key must start with sk_';
  }
  if (updates.webhookSecret !== undefined) {
    const v = String(updates.webhookSecret).trim();
    if (v && !v.startsWith('whsec_')) return 'Webhook secret must start with whsec_';
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const source = req.method === 'POST' ? req.body : req.query;
  const uid = (typeof source?.userId === 'string' ? source.userId.trim() : '') || '';
  if (!uid) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const auth = await requireOwnerOrDeveloper(uid);
  if (auth.error) {
    return res.status(auth.status || 403).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const config = await getStripeConfigForSettings();
      return res.status(200).json(config);
    } catch (e) {
      console.error('[settings/stripe] GET', e?.message ?? 'Unknown error');
      return res.status(500).json({ error: 'Failed to load Stripe config' });
    }
  }

  // POST
  const updates = {};
  if (source?.publishableKey !== undefined) updates.publishableKey = source.publishableKey;
  if (source?.secretKey !== undefined) updates.secretKey = source.secretKey;
  if (source?.webhookSecret !== undefined) updates.webhookSecret = source.webhookSecret;
  if (source?.paymentMethodConfigId !== undefined) updates.paymentMethodConfigId = source.paymentMethodConfigId;

  const validationError = validateStripeKeys(updates);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const current = await getStripeConfig();
    const result = await saveStripeConfig(updates, current);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[settings/stripe] POST', e?.message ?? 'Unknown error');
    return res.status(500).json({ error: 'Failed to save Stripe config' });
  }
}
