/**
 * GET: return marketing provider config for Settings UI (secrets masked).
 * POST: save marketing provider config. Only superadmin or developer.
 * Body for both: { userId }, optional { organizationId }.
 * POST body: { defaultEmailProvider?, defaultSmsProvider?, providers? } (full or partial).
 */

import { createClient } from '@supabase/supabase-js';
import { getMarketingConfig, getMarketingConfigForSettings, saveMarketingConfig } from '@/lib/getMarketingConfig';

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

async function requireOwnerOrDeveloper(userId, organizationId = null) {
  const supabase = getAdmin();
  if (!supabase) return { error: 'Service unavailable', status: 503 };

  let query = supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId);

  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data: rows, error } = await query;

  if (error) return { error: error.message, status: 500 };
  const allowed = (rows || []).some((r) => r.role === 'superadmin' || r.role === 'developer');
  if (!allowed) return { error: 'Only superadmin or developer can manage marketing provider settings', status: 403 };
  return { allowed: true };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const source = req.method === 'POST' ? req.body : req.query;
  const { userId, organizationId } = source || {};
  const uid = typeof userId === 'string' ? userId.trim() : '';
  if (!uid) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const auth = await requireOwnerOrDeveloper(uid, organizationId || null);
  if (auth.error) {
    return res.status(auth.status || 403).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const config = await getMarketingConfigForSettings();
      return res.status(200).json(config);
    } catch (e) {
      console.error('[settings/marketing-providers] GET', e);
      return res.status(500).json({ error: 'Failed to load marketing provider config' });
    }
  }

  // POST
  const incoming = req.body || {};
  try {
    const current = await getMarketingConfig();
    const result = await saveMarketingConfig(incoming, current);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[settings/marketing-providers] POST', e);
    return res.status(500).json({ error: 'Failed to save marketing provider config' });
  }
}
