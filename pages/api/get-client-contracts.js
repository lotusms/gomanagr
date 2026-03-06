/**
 * Returns client contract entries. POST body: { userId, clientId, organizationId?, contractId? }
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

  const { userId, clientId, organizationId, contractId } = req.body || {};
  if (!userId || !clientId) {
    return res.status(400).json({ error: 'Missing userId or clientId' });
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
      .from('client_contracts')
      .select('*')
      .eq('client_id', clientId);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    if (contractId) {
      query = query.eq('id', contractId);
    } else {
      query = query.order('start_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[get-client-contracts]', error);
      return res.status(500).json({ error: 'Failed to load contracts' });
    }

    if (contractId) {
      const one = Array.isArray(data) ? data[0] : data;
      if (!one) return res.status(404).json({ error: 'Contract not found' });
      if (one.related_proposal_id) {
        const { data: prop } = await supabaseAdmin
          .from('client_proposals')
          .select('id, proposal_number, proposal_title')
          .eq('id', one.related_proposal_id)
          .limit(1)
          .single();
        if (prop) one.related_proposal = prop;
      }
      return res.status(200).json({ contract: one });
    }

    const contracts = data || [];
    const proposalIds = [...new Set(contracts.map((c) => c.related_proposal_id).filter(Boolean))];
    let proposalsMap = {};
    if (proposalIds.length > 0) {
      const { data: proposals } = await supabaseAdmin
        .from('client_proposals')
        .select('id, proposal_number, proposal_title')
        .in('id', proposalIds);
      if (proposals?.length) {
        proposalsMap = Object.fromEntries(proposals.map((p) => [p.id, p]));
      }
    }
    const contractsWithProposal = contracts.map((c) => {
      if (c.related_proposal_id && proposalsMap[c.related_proposal_id]) {
        return { ...c, related_proposal: proposalsMap[c.related_proposal_id] };
      }
      return c;
    });

    return res.status(200).json({ contracts: contractsWithProposal });
  } catch (err) {
    console.error('[get-client-contracts]', err);
    return res.status(500).json({ error: 'Failed to load contracts' });
  }
}
