/**
 * Updates the organization's clients (stored on admin's user_profiles).
 * - Admin: can replace full list or update any client.
 * - Member: can only add a new client (with assignedTo: [userId]) or update/deactivate clients where assignedTo includes userId.
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

function sanitizeClient(client) {
  if (!client || typeof client !== 'object') return null;
  const out = JSON.parse(JSON.stringify(client));
  if (Array.isArray(out.assignedTo)) {
    out.assignedTo = out.assignedTo.filter((id) => typeof id === 'string' && id.length > 0);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, clients: fullReplace, client: singleClient, action } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memErr || !membership?.organization_id) {
      return res.status(403).json({ error: 'Not in an organization' });
    }

    const orgId = membership.organization_id;
    const isOrgAdmin = ['superadmin', 'admin', 'developer'].includes(membership.role);

    const { data: adminRows } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1);

    if (!adminRows?.length) {
      return res.status(403).json({ error: 'Organization has no admin' });
    }

    const adminUserId = adminRows[0].user_id;

    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('clients')
      .eq('id', adminUserId)
      .single();

    if (profileErr || !profileRow) {
      return res.status(500).json({ error: 'Failed to load org clients' });
    }

    let nextClients = Array.isArray(profileRow.clients) ? [...profileRow.clients] : [];

    if (isOrgAdmin) {
      if (Array.isArray(fullReplace)) {
        nextClients = fullReplace.map(sanitizeClient).filter(Boolean);
      } else if (singleClient && action) {
        const c = sanitizeClient(singleClient);
        if (!c) return res.status(400).json({ error: 'Invalid client' });
        if (action === 'add') {
          if (!c.id) c.id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          nextClients = nextClients.filter((x) => x.id !== c.id);
          nextClients.push(c);
        } else if (action === 'update' || action === 'deactivate') {
          const idx = nextClients.findIndex((x) => x.id === c.id);
          if (idx === -1) return res.status(404).json({ error: 'Client not found' });
          if (action === 'deactivate') nextClients[idx] = { ...nextClients[idx], ...c, status: 'inactive' };
          else nextClients[idx] = { ...nextClients[idx], ...c };
        }
      }
    } else {
      // Member: only add (with assignedTo self) or update/deactivate clients they're assigned to
      const canEdit = (c) => Array.isArray(c?.assignedTo) && c.assignedTo.includes(userId);

      if (singleClient && action === 'add') {
        const c = sanitizeClient(singleClient);
        if (!c) return res.status(400).json({ error: 'Invalid client' });
        if (!c.id) c.id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        c.assignedTo = Array.isArray(c.assignedTo) ? [...c.assignedTo] : [];
        if (!c.assignedTo.includes(userId)) c.assignedTo.push(userId);
        nextClients = nextClients.filter((x) => x.id !== c.id);
        nextClients.push(c);
      } else if (singleClient && (action === 'update' || action === 'deactivate')) {
        const c = sanitizeClient(singleClient);
        if (!c?.id) return res.status(400).json({ error: 'Invalid client' });
        const idx = nextClients.findIndex((x) => x.id === c.id);
        if (idx === -1) return res.status(404).json({ error: 'Client not found' });
        if (!canEdit(nextClients[idx])) return res.status(403).json({ error: 'Not allowed to edit this client' });
        if (action === 'deactivate') nextClients[idx] = { ...nextClients[idx], ...c, status: 'inactive' };
        else nextClients[idx] = { ...nextClients[idx], ...c };
      } else if (Array.isArray(fullReplace)) {
        return res.status(403).json({ error: 'Members cannot replace the full client list' });
      } else {
        return res.status(400).json({ error: 'Missing client and action or clients array' });
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        clients: nextClients,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminUserId);

    if (updateErr) {
      console.error('[update-org-clients]', updateErr);
      return res.status(500).json({ error: 'Failed to save clients' });
    }

    return res.status(200).json({ clients: nextClients });
  } catch (err) {
    console.error('[update-org-clients]', err);
    return res.status(500).json({ error: 'Failed to update clients' });
  }
}
