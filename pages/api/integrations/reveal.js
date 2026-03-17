/**
 * Return decrypted integration config for one provider after PIN verification.
 * POST body: { userId, organizationId, provider, pin }
 * SECURITY: Never log config or pin. Only return config after PIN is verified.
 */

import { createClient } from '@supabase/supabase-js';
import { getOrgIntegration } from '@/lib/integrations/get-org-integration';
import { verifyPin } from '@/lib/revealPin';

const PROVIDERS = ['stripe', 'twilio', 'mailchimp', 'resend', 'smtp'];

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
  const { data: rows, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId);
  if (error) return { error: error.message, status: 500 };
  const allowed = (rows || []).some((r) => r.role === 'superadmin' || r.role === 'developer');
  if (!allowed) return { error: 'Only org owner or developer can view credentials', status: 403 };
  return { allowed: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.body?.userId?.trim();
  const organizationId = req.body?.organizationId?.trim();
  const provider = req.body?.provider?.trim();
  const pin = req.body?.pin;

  if (!userId || !organizationId || !provider) {
    return res.status(400).json({ error: 'Missing userId, organizationId, or provider' });
  }
  if (!PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  if (pin == null || String(pin).trim() === '') {
    return res.status(400).json({ error: 'PIN is required' });
  }

  const auth = await requireOwnerOrDeveloper(userId, organizationId);
  if (auth.error) {
    return res.status(auth.status || 403).json({ error: auth.error });
  }

  const supabase = getAdmin();
  if (!supabase) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const pinResult = await verifyPin(supabase, userId, pin);
  if (!pinResult.ok) {
    return res.status(200).json({ ok: false, error: pinResult.error || 'Incorrect PIN' });
  }

  const integration = await getOrgIntegration(organizationId, provider);
  if (!integration || !integration.config) {
    return res.status(200).json({ ok: true, config: null });
  }

  return res.status(200).json({ ok: true, config: integration.config });
}
