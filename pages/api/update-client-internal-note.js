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

function parseBody(body, existing) {
  let tag = existing?.tag ?? null;
  if (body.tag !== undefined) {
    tag = body.tag && VALID_TAGS.includes(String(body.tag).toLowerCase()) ? String(body.tag).toLowerCase() : null;
  }
  return {
    content: body.content !== undefined ? String(body.content ?? '').trim() || '' : (existing?.content ?? ''),
    tag,
    is_pinned: body.is_pinned !== undefined ? Boolean(body.is_pinned) : (existing?.is_pinned ?? false),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });
  const { userId, noteId, organizationId } = req.body || {};
  if (!userId || !noteId) return res.status(400).json({ error: 'Missing userId or noteId' });
  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin.from('client_internal_notes').select('*').eq('id', noteId).limit(1).single();
    if (fetchErr || !existing) return res.status(404).json({ error: 'Internal note not found' });
    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Note does not belong to this organization' });
      const { data: membership } = await supabaseAdmin.from('org_members').select('organization_id').eq('user_id', userId).eq('organization_id', organizationId).limit(1).single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Note does not belong to you' });
    }
    const updates = parseBody(req.body, existing);
    const { error: updateErr } = await supabaseAdmin.from('client_internal_notes').update(updates).eq('id', noteId);
    if (updateErr) {
      console.error('[update-client-internal-note]', updateErr);
      return res.status(500).json({ error: 'Failed to update internal note' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-internal-note]', err);
    return res.status(500).json({ error: 'Failed to update internal note' });
  }
}
