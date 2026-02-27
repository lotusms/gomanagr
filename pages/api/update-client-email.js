/**
 * Updates a client email log entry. Verifies the email belongs to the user's scope (solo or org).
 * POST body: { userId, emailId, organizationId?, subject, direction, to_from, summary, body, attachments?, sent_at?, related_project_case?, follow_up_date? }
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
  const attachments = Array.isArray(body.attachments) ? body.attachments : (existing?.attachments ?? []);
  const sentAt = body.sent_at
    ? new Date(body.sent_at).toISOString()
    : (existing?.sent_at ?? new Date().toISOString());
  const followUp = body.follow_up_date !== undefined
    ? (body.follow_up_date
        ? (String(body.follow_up_date).includes('T')
            ? String(body.follow_up_date).slice(0, 10)
            : String(body.follow_up_date))
        : null)
    : (existing?.follow_up_date ?? null);
  return {
    subject: String(body.subject ?? existing?.subject ?? '').trim() || '',
    direction: body.direction === 'received' ? 'received' : 'sent',
    to_from: String(body.to_from ?? existing?.to_from ?? '').trim() || '',
    summary: String(body.summary ?? existing?.summary ?? '').trim() || '',
    body: String(body.body ?? existing?.body ?? '').trim() || '',
    attachments,
    sent_at: sentAt,
    related_project_case: body.related_project_case !== undefined
      ? (body.related_project_case ? String(body.related_project_case).trim() : null)
      : (existing?.related_project_case ?? null),
    follow_up_date: followUp,
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

  const { userId, emailId, organizationId } = req.body || {};
  if (!userId || !emailId) {
    return res.status(400).json({ error: 'Missing userId or emailId' });
  }

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_emails')
      .select('*')
      .eq('id', emailId)
      .limit(1)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Email not found' });
    }

    if (organizationId) {
      if (existing.organization_id !== organizationId) {
        return res.status(403).json({ error: 'Email does not belong to this organization' });
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
        return res.status(403).json({ error: 'Email does not belong to you' });
      }
    }

    const updates = parseBody(req.body, existing);

    const { error: updateErr } = await supabaseAdmin
      .from('client_emails')
      .update(updates)
      .eq('id', emailId);

    if (updateErr) {
      console.error('[update-client-email]', updateErr);
      return res.status(500).json({ error: 'Failed to update email' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-client-email]', err);
    return res.status(500).json({ error: 'Failed to update email' });
  }
}
