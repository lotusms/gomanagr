/**
 * Returns the next suggested document ID for a given type and date.
 * POST body: { userId, organizationId?, prefix, date? }
 * prefix: 'PROP' | 'INV' | 'CON' | etc.
 * date: YYYY-MM-DD or YYYYMMDD (default: today) — used only in the ID string; sequence ignores date.
 * Returns: { suggestedId, orgPrefix }
 * Sequence is global per (org + prefix): next number across all existing IDs, regardless of date.
 */

const { createClient } = require('@supabase/supabase-js');
const { formatDocumentId, parseDocumentId } = require('@/lib/documentIdsServer');

let supabaseAdmin;

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  supabaseAdmin = null;
}

const PREFIX_TO_TABLE_AND_COL = {
  PROP: { table: 'client_proposals', column: 'proposal_number' },
  INV: { table: 'client_invoices', column: 'invoice_number' },
  CON: { table: 'client_contracts', column: 'contract_number' },
  CONT: { table: 'client_contracts', column: 'contract_number' },
  PROJ: { table: 'client_projects', column: 'project_number' },
};

function toDateYyyyMmDd(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim().replace(/-/g, '');
  if (s.length < 8) return null;
  return s.slice(0, 8);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId, prefix, date } = req.body || {};
  if (!userId || !prefix) {
    return res.status(400).json({ error: 'Missing userId or prefix' });
  }

  const docPrefix = String(prefix).trim().toUpperCase();
  const mapping = PREFIX_TO_TABLE_AND_COL[docPrefix];
  if (!mapping) {
    return res.status(400).json({ error: `Unsupported prefix: ${prefix}` });
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

    const datePart = toDateYyyyMmDd(date) || toDateYyyyMmDd(new Date().toISOString().slice(0, 10));
    let orgPrefix = 'PER';

    if (organizationId) {
      const { data: org, error: orgErr } = await supabaseAdmin
        .from('organizations')
        .select('id_prefix, name')
        .eq('id', organizationId)
        .limit(1)
        .single();
      if (!orgErr && org) {
        const raw = (org.id_prefix || '').trim().toUpperCase().slice(0, 3);
        if (raw.length >= 3) {
          orgPrefix = raw;
        } else if (org.name) {
          orgPrefix = org.name
            .replace(/[^a-zA-Z]/g, '')
            .toUpperCase()
            .slice(0, 3)
            .padEnd(3, 'X');
        }
      }
    }

    let query = supabaseAdmin.from(mapping.table).select(mapping.column);
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }
    const { data: rows, error } = await query;

    if (error) {
      console.error('[get-next-document-id]', error);
      return res.status(500).json({ error: 'Failed to compute next ID' });
    }

    let maxSeq = 0;
    const list = rows || [];
    for (const row of list) {
      const value = row[mapping.column];
      if (!value) continue;
      const parsed = parseDocumentId(value);
      if (parsed && parsed.docPrefix === docPrefix) {
        if (parsed.sequence > maxSeq) maxSeq = parsed.sequence;
      }
    }
    const nextSequence = maxSeq + 1;
    const suggestedId = formatDocumentId(orgPrefix, docPrefix, datePart, nextSequence);

    return res.status(200).json({ suggestedId, orgPrefix });
  } catch (err) {
    console.error('[get-next-document-id]', err);
    return res.status(500).json({ error: 'Failed to get next document ID' });
  }
}
