/**
 * Creates a client call log entry.
 * POST body: { userId, clientId, organizationId?, direction, phone_number, duration, summary, outcome?, follow_up_at?, team_member?, called_at? }
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

const DIRECTIONS = ['incoming', 'outgoing'];
const OUTCOMES = ['no_answer', 'left_voicemail', 'resolved', 'follow_up_needed'];

function parseBody(body) {
  const direction = DIRECTIONS.includes(String(body.direction || '').toLowerCase())
    ? String(body.direction).toLowerCase()
    : 'outgoing';
  const outcome = OUTCOMES.includes(String(body.outcome || '').toLowerCase())
    ? String(body.outcome).toLowerCase()
    : 'resolved';
  const calledAt = body.called_at ? new Date(body.called_at).toISOString() : new Date().toISOString();
  const followUpAt = body.follow_up_at ? new Date(body.follow_up_at).toISOString() : null;
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    direction,
    phone_number: String(body.phone_number ?? '').trim() || '',
    duration: String(body.duration ?? '').trim() || '',
    summary: String(body.summary ?? '').trim() || '',
    outcome,
    follow_up_at: followUpAt,
    team_member: body.team_member ? String(body.team_member).trim() : null,
    called_at: calledAt,
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

    const { data, error } = await supabaseAdmin.from('client_calls').insert(row).select('id').single();

    if (error) {
      console.error('[create-client-call]', error);
      return res.status(500).json({ error: 'Failed to create call' });
    }

    return res.status(201).json({ id: data.id, call: { ...row, id: data.id } });
  } catch (err) {
    console.error('[create-client-call]', err);
    return res.status(500).json({ error: 'Failed to create call' });
  }
}
