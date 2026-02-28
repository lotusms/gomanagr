/**
 * Updates a client meeting note. POST body: { userId, noteId, organizationId?, ...fields }
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

function parseBody(body, existing) {
  const meetingAt = body.meeting_at
    ? new Date(body.meeting_at).toISOString()
    : (existing?.meeting_at ?? new Date().toISOString());
  let nextDate = existing?.next_meeting_date ?? null;
  if (body.next_meeting_date !== undefined) {
    nextDate = body.next_meeting_date
      ? (String(body.next_meeting_date).includes('T') ? String(body.next_meeting_date).slice(0, 10) : String(body.next_meeting_date))
      : null;
  }
  return {
    title: String(body.title ?? existing?.title ?? '').trim() || '',
    meeting_at: meetingAt,
    attendees: String(body.attendees ?? existing?.attendees ?? '').trim() || '',
    location_zoom_link: String(body.location_zoom_link ?? existing?.location_zoom_link ?? '').trim() || '',
    notes: String(body.notes ?? existing?.notes ?? '').trim() || '',
    decisions_made: String(body.decisions_made ?? existing?.decisions_made ?? '').trim() || '',
    action_items: String(body.action_items ?? existing?.action_items ?? '').trim() || '',
    next_meeting_date: nextDate,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { userId, noteId, organizationId } = req.body || {};
  if (!userId || !noteId) return res.status(400).json({ error: 'Missing userId or noteId' });

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_meeting_notes')
      .select('*')
      .eq('id', noteId)
      .limit(1)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: 'Meeting note not found' });

    if (organizationId) {
      if (existing.organization_id !== organizationId) return res.status(403).json({ error: 'Meeting note does not belong to this organization' });
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) return res.status(403).json({ error: 'Not a member of this organization' });
    } else {
      if (existing.organization_id != null || existing.user_id !== userId) return res.status(403).json({ error: 'Meeting note does not belong to you' });
    }

    const updates = parseBody(req.body, existing);
    const { error: updateErr } = await supabaseAdmin.from('client_meeting_notes').update(updates).eq('id', noteId);
    if (updateErr) {
      console.error('[update-client-meeting-note]', updateErr);
      return res.status(500).json({ error: 'Failed to update meeting note' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-meeting-note]', err);
    return res.status(500).json({ error: 'Failed to update meeting note' });
  }
}
