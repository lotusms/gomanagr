/**
 * Deletes a client call log entry.
 * POST body: { userId, callId, organizationId? }
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

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, callId, organizationId } = req.body || {};

  if (!userId || !callId) {
    return res.status(400).json({ error: 'Missing userId or callId' });
  }

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_calls')
      .select('id, user_id, organization_id')
      .eq('id', callId)
      .limit(1)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (organizationId) {
      if (existing.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Call does not belong to this organization' });
      }
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this organization' });
      }
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) {
        return res.status(403).json({ error: 'Call does not belong to you' });
      }
    }

    const { error: deleteErr } = await supabaseAdmin.from('client_calls').delete().eq('id', callId);

    if (deleteErr) {
      console.error('[delete-client-call]', deleteErr);
      return res.status(500).json({ error: 'Failed to delete call' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[delete-client-call]', err);
    return res.status(500).json({ error: 'Failed to delete call' });
  }
}
