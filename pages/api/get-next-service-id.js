/**
 * Returns the next suggested service ID (nomenclature: ORG-SVC-YYYYMMDD-NNN).
 * Services are stored in user_profiles.services (owner's); sequence is global per org+prefix.
 * POST body: { userId, organizationId?, date? }
 * Returns: { suggestedId, orgPrefix }
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

  const { userId, organizationId, date } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    let ownerUserId = userId;
    let orgPrefix = 'PER';

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

      const { data: superadminRow } = await supabaseAdmin
        .from('org_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('role', 'superadmin')
        .limit(1)
        .maybeSingle();
      const { data: developerRows } = await supabaseAdmin
        .from('org_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('role', 'developer')
        .limit(1);
      const { data: adminRows } = await supabaseAdmin
        .from('org_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('role', 'admin')
        .limit(1);

      const resolvedOwnerId = superadminRow?.user_id || (developerRows?.[0]?.user_id) || (adminRows?.[0]?.user_id);
      if (resolvedOwnerId) {
        ownerUserId = resolvedOwnerId;
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('id_prefix, name')
          .eq('id', organizationId)
          .limit(1)
          .single();
        if (org) {
          const raw = (org.id_prefix || '').trim().toUpperCase().slice(0, 3);
          orgPrefix = raw.length >= 3 ? raw : (org.name || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
        }
      }
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('services')
      .eq('id', ownerUserId)
      .single();

    if (profileErr || !profile) {
      const datePart = toDateYyyyMmDd(date) || toDateYyyyMmDd(new Date().toISOString().slice(0, 10));
      const suggestedId = formatDocumentId(orgPrefix, 'SVC', datePart, 1);
      return res.status(200).json({ suggestedId, orgPrefix });
    }

    const services = Array.isArray(profile.services) ? profile.services : [];
    const datePart = toDateYyyyMmDd(date) || toDateYyyyMmDd(new Date().toISOString().slice(0, 10));
    let maxSeq = 0;

    for (const svc of services) {
      const num = svc?.service_number;
      if (!num) continue;
      const parsed = parseDocumentId(num);
      if (parsed && parsed.docPrefix === 'SVC' && parsed.sequence > maxSeq) {
        maxSeq = parsed.sequence;
      }
    }

    const nextSequence = maxSeq + 1;
    const suggestedId = formatDocumentId(orgPrefix, 'SVC', datePart, nextSequence);
    return res.status(200).json({ suggestedId, orgPrefix });
  } catch (err) {
    console.error('[get-next-service-id]', err);
    return res.status(500).json({ error: 'Failed to get next service ID' });
  }
}
