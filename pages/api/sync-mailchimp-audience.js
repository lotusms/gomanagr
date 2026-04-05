/**
 * Sync all GoManagr org clients (with email) to the Mailchimp "GoManagr Contacts" audience.
 * POST { userId, organizationId }
 */
import { createClient } from '@supabase/supabase-js';
import { syncOrgClientsToMailchimp } from '@/lib/marketing/syncOrgClientsToMailchimp';

let supabaseAdmin;
try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
} catch {
  supabaseAdmin = null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId } = req.body || {};
  if (!userId || !organizationId) {
    return res.status(400).json({ error: 'Missing userId or organizationId' });
  }

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memErr || membership?.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Not allowed to sync this organization' });
    }

    const result = await syncOrgClientsToMailchimp(organizationId, supabaseAdmin);
    if (!result.success) {
      return res.status(200).json({
        success: false,
        synced: 0,
        error: result.error || 'Sync failed',
      });
    }

    return res.status(200).json({
      success: true,
      synced: result.synced,
      batch: result.batch,
    });
  } catch (err) {
    console.error('[sync-mailchimp-audience]', err);
    return res.status(500).json({ error: err.message || 'Sync failed' });
  }
}
