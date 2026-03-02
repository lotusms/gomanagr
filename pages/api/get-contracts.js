/**
 * Returns all contracts for the user (or org), or a single contract by id.
 * POST body: { userId, organizationId?, contractId?, clientId? }
 * When contractId is set, returns { contract }. Otherwise returns { contracts }.
 * When clientId is set, filters by client_id (for client profile tab).
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

  const { userId, organizationId, contractId, clientId } = req.body || {};
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

    let query = supabaseAdmin.from('client_contracts').select('*');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (contractId) {
      query = query.eq('id', contractId).limit(1);
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error('[get-contracts]', error);
        return res.status(500).json({ error: 'Failed to load contract' });
      }
      if (!data) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      if (data.related_proposal_id) {
        const { data: prop } = await supabaseAdmin
          .from('client_proposals')
          .select('id, proposal_number, proposal_title')
          .eq('id', data.related_proposal_id)
          .limit(1)
          .single();
        if (prop) data.related_proposal = prop;
      }
      return res.status(200).json({ contract: data });
    }

    query = query
      .order('effective_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[get-contracts]', error);
      return res.status(500).json({ error: 'Failed to load contracts' });
    }

    return res.status(200).json({ contracts: data || [] });
  } catch (err) {
    console.error('[get-contracts]', err);
    return res.status(500).json({ error: 'Failed to load contracts' });
  }
}
