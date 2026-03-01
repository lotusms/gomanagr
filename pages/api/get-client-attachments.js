/**
 * Returns client attachment entries. POST body: { userId, clientId, organizationId?, attachmentId? }
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

  const { userId, clientId, organizationId, attachmentId } = req.body || {};
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
      .from('client_attachments')
      .select('*')
      .eq('client_id', clientId);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    if (attachmentId) {
      query = query.eq('id', attachmentId);
    } else {
      query = query.order('upload_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[get-client-attachments]', error);
      return res.status(500).json({ error: 'Failed to load attachments' });
    }

    const list = Array.isArray(data) ? data : data ? [data] : [];
    const contractIds = [...new Set(list.map((a) => a.linked_contract_id).filter(Boolean))];
    let contractMap = {};
    if (contractIds.length > 0) {
      const { data: contracts } = await supabaseAdmin
        .from('client_contracts')
        .select('id, contract_number, contract_title')
        .in('id', contractIds);
      if (contracts && contracts.length) {
        contractMap = contracts.reduce((acc, c) => {
          acc[c.id] = { id: c.id, contract_number: c.contract_number, contract_title: c.contract_title };
          return acc;
        }, {});
      }
    }
    const enriched = list.map((a) => ({
      ...a,
      linked_contract: a.linked_contract_id ? contractMap[a.linked_contract_id] || null : null,
    }));

    if (attachmentId) {
      const one = enriched[0];
      if (!one) return res.status(404).json({ error: 'Attachment not found' });
      return res.status(200).json({ attachment: one });
    }

    return res.status(200).json({ attachments: enriched });
  } catch (err) {
    console.error('[get-client-attachments]', err);
    return res.status(500).json({ error: 'Failed to load attachments' });
  }
}
