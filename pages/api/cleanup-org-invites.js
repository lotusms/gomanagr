/**
 * Deletes used and expired rows from org_invites to avoid keeping unnecessary records.
 * Callable by org superadmin (Bearer token) or by a weekly cron (x-cron-secret).
 * Deletes: used = true OR expires_at < now()
 */

const { createClient } = require('@supabase/supabase-js');

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

async function getUserIdFromBearer(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return null;
  try {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error } = await anon.auth.getUser(token);
    if (error || !user?.id) return null;
    return user.id;
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const cronSecret = process.env.CRON_SECRET || process.env.INVITE_CLEANUP_SECRET;
  const authHeader = req.headers?.authorization || '';
  const bearerMatch = authHeader.match(/^\s*Bearer\s+(.+)$/i);
  const providedCronSecret =
    (bearerMatch && bearerMatch[1] ? bearerMatch[1].trim() : null) ||
    req.headers['x-cron-secret'] ||
    (req.method === 'POST' && req.body && req.body.cronSecret);

  const allowedByCron = !!cronSecret && typeof providedCronSecret === 'string' && providedCronSecret === cronSecret;

  if (!allowedByCron) {
    const userId = await getUserIdFromBearer(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Bearer token or x-cron-secret required' });
    }
    const { data: membership } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!membership || !['superadmin', 'developer'].includes(membership.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only organization owner (superadmin) or developer can run cleanup' });
    }
  }

  try {
    const now = new Date().toISOString();
    const { data: toDelete, error: selectErr } = await supabaseAdmin
      .from('org_invites')
      .select('id')
      .or(`used.eq.true,expires_at.lt.${now}`);

    if (selectErr) {
      console.error('[cleanup-org-invites] select error', selectErr);
      return res.status(500).json({ error: 'Failed to list invites', details: selectErr.message });
    }

    const ids = (toDelete || []).map((r) => r.id);
    if (ids.length === 0) {
      return res.status(200).json({ deleted: 0, message: 'No invites to clean up' });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('org_invites')
      .delete()
      .in('id', ids);

    if (deleteErr) {
      console.error('[cleanup-org-invites] delete error', deleteErr);
      return res.status(500).json({ error: 'Failed to delete invites', details: deleteErr.message });
    }

    return res.status(200).json({ deleted: ids.length });
  } catch (err) {
    console.error('[cleanup-org-invites]', err);
    return res.status(500).json({ error: err.message || 'Cleanup failed' });
  }
}
