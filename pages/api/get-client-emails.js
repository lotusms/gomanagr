/**
 * Returns client email log entries for a client.
 * POST body: { userId, clientId, organizationId? }
 * - If organizationId is set: returns emails for that client in org context.
 * - If not: returns emails for that client in solo context (user_id = userId, organization_id null).
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, clientId, organizationId, emailId } = req.body || {};
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

    let query = supabaseAdmin
      .from('client_emails')
      .select('*')
      .eq('client_id', clientId);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    if (emailId) {
      query = query.eq('id', emailId);
    } else {
      query = query.order('sent_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[get-client-emails]', error);
      return res.status(500).json({ error: 'Failed to load emails' });
    }

    if (emailId) {
      const one = Array.isArray(data) ? data[0] : data;
      if (!one) return res.status(404).json({ error: 'Email not found' });
      return res.status(200).json({ email: one });
    }

    return res.status(200).json({ emails: data || [] });
  } catch (err) {
    console.error('[get-client-emails]', err);
    return res.status(500).json({ error: 'Failed to load emails' });
  }
}
