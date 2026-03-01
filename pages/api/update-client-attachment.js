/**
 * Updates a client attachment. POST body: { userId, attachmentId, organizationId?, ...fields }
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

function toDateOnly(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.includes('T') ? s.slice(0, 10) : s;
}

function parseBody(body, existing) {
  return {
    file_name: String(body.file_name ?? existing?.file_name ?? '').trim() || '',
    file_type: String(body.file_type ?? existing?.file_type ?? '').trim() || '',
    description: String(body.description ?? existing?.description ?? '').trim() || '',
    upload_date: body.upload_date !== undefined ? toDateOnly(body.upload_date) : (existing?.upload_date ?? null),
    related_item: body.related_item !== undefined ? (body.related_item ? String(body.related_item).trim() || null : null) : (existing?.related_item ?? null),
    linked_contract_id: body.linked_contract_id !== undefined ? body.linked_contract_id || null : (existing?.linked_contract_id ?? null),
    version: body.version !== undefined ? (body.version ? String(body.version).trim() || null : null) : (existing?.version ?? null),
    file_url: body.file_url !== undefined ? (body.file_url ? String(body.file_url).trim() || null : null) : (existing?.file_url ?? null),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { userId, attachmentId, organizationId } = req.body || {};
  if (!userId || !attachmentId) return res.status(400).json({ error: 'Missing userId or attachmentId' });

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_attachments')
      .select('*')
      .eq('id', attachmentId)
      .limit(1)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Attachment not found' });

    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Attachment does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Attachment does not belong to you' });
    }

    const updates = parseBody(req.body, existing);
    const { error: updateErr } = await supabaseAdmin.from('client_attachments').update(updates).eq('id', attachmentId);
    if (updateErr) {
      console.error('[update-client-attachment]', updateErr);
      return res.status(500).json({ error: 'Failed to update attachment' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-attachment]', err);
    return res.status(500).json({ error: 'Failed to update attachment' });
  }
}
