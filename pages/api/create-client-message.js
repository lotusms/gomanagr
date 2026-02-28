/**
 * Creates a client message log entry.
 * POST body: { userId, clientId, organizationId?, channel, direction, author, body, sent_at? }
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

const CHANNELS = ['sms', 'chat', 'other'];

function parseBody(body) {
  const channel = CHANNELS.includes(String(body.channel || '').toLowerCase())
    ? String(body.channel).toLowerCase()
    : 'other';
  const sentAt = body.sent_at ? new Date(body.sent_at).toISOString() : new Date().toISOString();
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    channel,
    direction: body.direction === 'received' ? 'received' : 'sent',
    author: String(body.author ?? '').trim() || '',
    body: String(body.body ?? '').trim() || '',
    sent_at: sentAt,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, clientId, organizationId } = req.body || {};
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

    const row = parseBody(req.body);
    if (row.user_id !== userId) {
      return res.status(400).json({ error: 'user_id must match userId' });
    }

    const { data, error } = await supabaseAdmin.from('client_messages').insert(row).select('id').single();

    if (error) {
      console.error('[create-client-message]', error);
      return res.status(500).json({ error: 'Failed to create message' });
    }

    return res.status(201).json({ id: data.id, message: { ...row, id: data.id } });
  } catch (err) {
    console.error('[create-client-message]', err);
    return res.status(500).json({ error: 'Failed to create message' });
  }
}
