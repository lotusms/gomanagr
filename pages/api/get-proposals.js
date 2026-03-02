/**
 * Returns all proposals for the user (or org), or a single proposal by id.
 * POST body: { userId, organizationId?, proposalId? }
 * When proposalId is set, returns { proposal }. Otherwise returns { proposals }.
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId, proposalId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    if (organizationId) {
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
    }

    let query = supabaseAdmin
      .from('client_proposals')
      .select('*');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    if (proposalId) {
      query = query.eq('id', proposalId).limit(1);
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error('[get-proposals]', error);
        return res.status(500).json({ error: 'Failed to load proposal' });
      }
      if (!data) {
        return res.status(404).json({ error: 'Proposal not found' });
      }
      return res.status(200).json({ proposal: data });
    }

    query = query
      .order('date_created', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[get-proposals]', error);
      return res.status(500).json({ error: 'Failed to load proposals' });
    }

    return res.status(200).json({ proposals: data || [] });
  } catch (err) {
    console.error('[get-proposals]', err);
    return res.status(500).json({ error: 'Failed to load proposals' });
  }
}
