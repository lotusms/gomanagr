/**
 * GET invite details by token (public). Returns only email and organization name
 * so the accept-invite page can show "Set your password for ..." without exposing sensitive data.
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
  }
} catch (e) {
  supabaseAdmin = null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  try {
    const { data: invite, error } = await supabaseAdmin
      .from('org_invites')
      .select('email, expires_at, used, organization_id, invitee_data')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return res.status(404).json({ error: 'Invalid or expired invite' });
    }
    if (invite.used) {
      return res.status(410).json({ error: 'This invite has already been used' });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite has expired' });
    }

    let organizationName = 'your organization';
    let organizationLogoUrl = null;
    if (invite.organization_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, logo_url')
        .eq('id', invite.organization_id)
        .single();
      if (org?.name) organizationName = org.name;
      if (org?.logo_url) organizationLogoUrl = org.logo_url;
    }

    return res.status(200).json({
      email: invite.email,
      organizationName,
      organizationLogoUrl: organizationLogoUrl || undefined,
      inviteeData: invite.invitee_data && typeof invite.invitee_data === 'object' ? invite.invitee_data : undefined,
    });
  } catch (err) {
    console.error('[invite-by-token]', err);
    return res.status(500).json({ error: 'Failed to load invite' });
  }
}
