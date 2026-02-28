/**
 * Updates a client message log entry.
 * POST body: { userId, messageId, organizationId?, channel, direction, to_from, body, sent_at? }
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

function parseBody(body, existing) {
  const rawChannel = (body.channel ?? existing?.channel ?? '').toString().toLowerCase();
  const channel = CHANNELS.includes(rawChannel) ? rawChannel : (existing?.channel ?? 'other');
  const sentAt = body.sent_at
    ? new Date(body.sent_at).toISOString()
    : (existing?.sent_at ?? new Date().toISOString());
  return {
    channel,
    direction: body.direction === 'received' ? 'received' : 'sent',
    to_from: String(body.to_from ?? existing?.to_from ?? '').trim() || '',
    body: String(body.body ?? existing?.body ?? '').trim() || '',
    sent_at: sentAt,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, messageId, organizationId } = req.body || {};
  if (!userId || !messageId) {
    return res.status(400).json({ error: 'Missing userId or messageId' });
  }

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_messages')
      .select('*')
      .eq('id', messageId)
      .limit(1)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (organizationId) {
      if (existing.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Message does not belong to this organization' });
      }
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
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) {
        return res.status(403).json({ error: 'Message does not belong to you' });
      }
    }

    const updates = parseBody(req.body, existing);

    const { error: updateErr } = await supabaseAdmin
      .from('client_messages')
      .update(updates)
      .eq('id', messageId);

    if (updateErr) {
      console.error('[update-client-message]', updateErr);
      return res.status(500).json({ error: 'Failed to update message' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-message]', err);
    return res.status(500).json({ error: 'Failed to update message' });
  }
}
