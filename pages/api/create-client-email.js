/**
 * Creates a client email log entry.
 * POST body: { userId, clientId, organizationId?, subject, direction, to_from, body, attachments?, sent_at?, related_project_case?, follow_up_date? }
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

function parseBody(body) {
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const sentAt = body.sent_at ? new Date(body.sent_at).toISOString() : new Date().toISOString();
  const followUp = body.follow_up_date
    ? (body.follow_up_date.includes('T') ? body.follow_up_date.slice(0, 10) : body.follow_up_date)
    : null;
  return {
    client_id: String(body.clientId ?? ''),
    user_id: body.userId,
    organization_id: body.organizationId || null,
    subject: String(body.subject ?? '').trim() || '',
    direction: body.direction === 'received' ? 'received' : 'sent',
    to_from: String(body.to_from ?? '').trim() || '',
    body: String(body.body ?? '').trim() || '',
    attachments,
    sent_at: sentAt,
    related_project_case: body.related_project_case ? String(body.related_project_case).trim() : null,
    follow_up_date: followUp,
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

    const { data, error } = await supabaseAdmin.from('client_emails').insert(row).select('id').single();

    if (error) {
      console.error('[create-client-email]', error);
      return res.status(500).json({ error: 'Failed to create email' });
    }

    return res.status(201).json({ id: data.id, email: { ...row, id: data.id } });
  } catch (err) {
    console.error('[create-client-email]', err);
    return res.status(500).json({ error: 'Failed to create email' });
  }
}
