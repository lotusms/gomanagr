/**
 * GET: return Stripe config for Settings UI (secrets masked). Optional organizationId for per-org.
 * POST: save Stripe config. When organizationId is provided, saves to organization_integrations (encrypted); otherwise app_settings.
 * Body for both: { userId }, optional { organizationId }.
 * POST body also: { publishableKey?, secretKey?, webhookSecret?, paymentMethodConfigId? }
 *
 * SECURITY: Never log req.body or any variable that may contain secretKey, webhookSecret,
 * or other credentials.
 */

import { createClient } from '@supabase/supabase-js';
import { getStripeConfig, getStripeConfigForSettings, saveStripeConfig } from '@/lib/getStripeConfig';
import { saveOrgIntegration } from '@/lib/integrations/get-org-integration';
import { validateStripeConfig, stripeMetadataFromConfig } from '@/lib/integrations/providers/stripe';

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

async function requireOwnerOrDeveloper(userId, organizationId) {
  const supabase = getAdmin();
  if (!supabase) return { error: 'Service unavailable', status: 503 };
  let query = supabase.from('org_members').select('role').eq('user_id', userId);
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data: rows, error } = await query;
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
  const orgId = (source?.organizationId != null && String(source.organizationId).trim()) ? String(source.organizationId).trim() : null;
  if (!uid) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const auth = await requireOwnerOrDeveloper(uid, orgId);
  if (auth.error) {
    return res.status(auth.status || 403).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const config = await getStripeConfigForSettings(orgId);
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
    if (orgId) {
      const current = await getStripeConfig(orgId);
      const next = {
        publishableKey: updates.publishableKey !== undefined ? String(updates.publishableKey || '').trim() : (current.publishableKey || ''),
        secretKey: updates.secretKey !== undefined ? String(updates.secretKey || '').trim() : (current.secretKey || ''),
        webhookSecret: updates.webhookSecret !== undefined ? String(updates.webhookSecret || '').trim() : (current.webhookSecret || ''),
        paymentMethodConfigId: updates.paymentMethodConfigId !== undefined ? String(updates.paymentMethodConfigId || '').trim() : (current.paymentMethodConfigId || ''),
      };
      const validation = await validateStripeConfig(next);
      const status = validation.ok ? 'connected' : 'invalid';
      const metadata = stripeMetadataFromConfig(next);
      const result = await saveOrgIntegration(orgId, 'stripe', next, metadata, status);
      if (result.error) return res.status(500).json({ error: result.error });
      return res.status(200).json({ success: true });
    }
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
