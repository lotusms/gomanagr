/**
 * GET: returns { platformAdmin: true } if the Bearer user is in platform_admins; else 403.
 * Used by the frontend to show/hide the Master backup section.
 */

import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/lib/apiAuth';

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  supabaseAdmin = null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authorization: Bearer <token> required' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { data, error } = await supabaseAdmin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[am-i-platform-admin]', error);
    return res.status(500).json({ error: 'Check failed' });
  }

  if (!data) {
    return res.status(403).json({ platformAdmin: false });
  }

  return res.status(200).json({ platformAdmin: true });
}
