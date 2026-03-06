const { createClient } = require('@supabase/supabase-js');
const { formatDocumentId, parseDocumentId } = require('@/lib/documentIdsServer');
const { ensureAttachmentsFromFiles } = require('@/lib/syncFilesToAttachments');

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

function toDateOnly(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.includes('T') ? s.slice(0, 10) : s;
}

const STATUSES = ['draft', 'active', 'inactive', 'on_hold', 'completed', 'abandoned'];

function toDateYyyyMmDd(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim().replace(/-/g, '');
  return s.length >= 8 ? s.slice(0, 8) : null;
}

function parseBody(body) {
  const status = STATUSES.includes(String(body.status || '').toLowerCase()) ? String(body.status).toLowerCase() : 'draft';
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    project_name: String(body.project_name ?? '').trim() || '',
    project_number: String(body.project_number ?? '').trim() || '',
    status,
    start_date: toDateOnly(body.start_date),
    end_date: toDateOnly(body.end_date),
    scope_summary: String(body.scope_summary ?? '').trim() || '',
    project_owner: String(body.project_owner ?? '').trim() || '',
    related_proposal_id: body.related_proposal_id ? String(body.related_proposal_id).trim() || null : null,
    related_contract_id: body.related_contract_id ? String(body.related_contract_id).trim() || null : null,
    notes: String(body.notes ?? '').trim() || '',
    file_urls: Array.isArray(body.file_urls) ? body.file_urls.map((u) => String(u).trim()).filter(Boolean) : [],
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });
  const { userId, clientId, organizationId } = req.body || {};
  if (!userId || !clientId) return res.status(400).json({ error: 'Missing userId or clientId' });
  try {
    if (organizationId) {
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    }
    const row = parseBody(req.body);
    if (row.user_id !== userId) return res.status(400).json({ error: 'user_id must match userId' });

    if (!row.project_number) {
      const datePart = toDateYyyyMmDd(row.start_date) || toDateYyyyMmDd(new Date().toISOString().slice(0, 10));
      let orgPrefix = 'PER';
      if (organizationId) {
        const { data: org } = await supabaseAdmin.from('organizations').select('id_prefix, name').eq('id', organizationId).limit(1).single();
        if (org) {
          const raw = (org.id_prefix || '').trim().toUpperCase().slice(0, 3);
          orgPrefix = raw.length >= 3 ? raw : (org.name || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
        }
      }
      let query = supabaseAdmin.from('client_projects').select('project_number');
      if (organizationId) query = query.eq('organization_id', organizationId);
      else query = query.eq('user_id', userId).is('organization_id', null);
      const { data: rows } = await query;
      let maxSeq = 0;
      for (const r of rows || []) {
        const parsed = parseDocumentId(r.project_number);
        if (parsed && parsed.docPrefix === 'PROJ' && parsed.sequence > maxSeq) maxSeq = parsed.sequence;
      }
      row.project_number = formatDocumentId(orgPrefix, 'PROJ', datePart, maxSeq + 1);
    }

    const { data, error } = await supabaseAdmin.from('client_projects').insert(row).select('id').single();
    if (error) {
      console.error('[create-client-project]', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }
    const fileUrls = Array.isArray(row.file_urls) ? row.file_urls : [];
    if (fileUrls.length > 0) {
      await ensureAttachmentsFromFiles(supabaseAdmin, {
        clientId: row.client_id,
        userId: row.user_id,
        organizationId: row.organization_id,
        fileUrls,
        linkedProjectId: data.id,
      });
    }
    return res.status(201).json({ id: data.id });
  } catch (err) {
    console.error('[create-client-project]', err);
    return res.status(500).json({ error: 'Failed to create project' });
  }
}
