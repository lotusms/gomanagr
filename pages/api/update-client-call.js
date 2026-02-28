/**
 * Updates a client call log entry. POST body: { userId, callId, organizationId?, ...fields }
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

function parseBody(body, existing) {
  const direction = DIRECTIONS.includes(String((body.direction ?? existing?.direction ?? '').toLowerCase()))
    ? String(body.direction ?? existing?.direction).toLowerCase()
    : (existing?.direction ?? 'outgoing');
  const outcome = OUTCOMES.includes(String((body.outcome ?? existing?.outcome ?? '').toLowerCase()))
    ? String(body.outcome ?? existing?.outcome).toLowerCase()
    : (existing?.outcome ?? 'resolved');
  const calledAt = body.called_at
    ? new Date(body.called_at).toISOString()
    : (existing?.called_at ?? new Date().toISOString());
  let followUpAt = existing?.follow_up_at ?? null;
  if (body.follow_up_at !== undefined) {
    followUpAt = body.follow_up_at ? new Date(body.follow_up_at).toISOString() : null;
  }
  return {
    direction,
    phone_number: String(body.phone_number ?? existing?.phone_number ?? '').trim() || '',
    duration: String(body.duration ?? existing?.duration ?? '').trim() || '',
    summary: String(body.summary ?? existing?.summary ?? '').trim() || '',
    outcome,
    follow_up_at: followUpAt,
    team_member: body.team_member !== undefined ? (body.team_member ? String(body.team_member).trim() : null) : (existing?.team_member ?? null),
    called_at: calledAt,
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

  const { userId, callId, organizationId } = req.body || {};
  if (!userId || !callId) {
    return res.status(400).json({ error: 'Missing userId or callId' });
  }

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_calls')
      .select('*')
      .eq('id', callId)
      .limit(1)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (organizationId) {
      if (existing.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Call does not belong to this organization' });
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
        return res.status(403).json({ error: 'Call does not belong to you' });
      }
    }

    const updates = parseBody(req.body, existing);

    const { error: updateErr } = await supabaseAdmin
      .from('client_calls')
      .update(updates)
      .eq('id', callId);

    if (updateErr) {
      console.error('[update-client-call]', updateErr);
      return res.status(500).json({ error: 'Failed to update call' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-call]', err);
    return res.status(500).json({ error: 'Failed to update call' });
  }
}
