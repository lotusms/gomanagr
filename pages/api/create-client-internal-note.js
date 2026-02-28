const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else supabaseAdmin = null;
} catch (e) {
  supabaseAdmin = null;
}

const VALID_TAGS = ['reminder', 'warning', 'preference', 'billing', 'issue'];

function parseBody(body) {
  const tag = body.tag && VALID_TAGS.includes(String(body.tag).toLowerCase()) ? String(body.tag).toLowerCase() : null;
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    content: String(body.content ?? '').trim() || '',
    tag,
    is_pinned: Boolean(body.is_pinned),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });
  const { userId, clientId, organizationId } = req.body || {};
  if (!userId || !clientId) return res.status(400).json({ error: 'Missing userId or clientId' });
  try {
    if (organizationId) {
      const { data: membership } = await supabaseAdmin.from('org_members').select('organization_id').eq('user_id', userId).eq('organization_id', organizationId).limit(1).single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    }
    const row = parseBody(req.body);
    if (row.user_id !== userId) return res.status(400).json({ error: 'user_id must match userId' });
    const { data, error } = await supabaseAdmin.from('client_internal_notes').insert(row).select('id').single();
    if (error) {
      console.error('[create-client-internal-note]', error);
      return res.status(500).json({ error: 'Failed to create internal note' });
    }
    return res.status(201).json({ id: data.id, note: { ...row, id: data.id } });
  } catch (err) {
    console.error('[create-client-internal-note]', err);
    return res.status(500).json({ error: 'Failed to create internal note' });
  }
}
