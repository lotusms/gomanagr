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

  const { organizationId, callerUserId, targetUserId, targetEmail, role } = req.body || {};
  if (!organizationId || !callerUserId || !role) {
    return res.status(400).json({ error: 'Missing organizationId, callerUserId, or role' });
  }
  if (!targetUserId && !targetEmail) {
    return res.status(400).json({ error: 'Provide targetUserId or targetEmail' });
  }
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or member' });
  }

  try {
    const { data: callerMembership, error: callerErr } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', callerUserId)
      .single();

    const callerRole = callerMembership?.role;
    const canChangeRoles = ['superadmin', 'admin', 'developer'].includes(callerRole);
    if (callerErr || !callerMembership || !canChangeRoles) {
      return res.status(403).json({ error: 'Only an organization admin can change member roles' });
    }

    let userIdToUpdate = targetUserId;
    if (!userIdToUpdate && targetEmail) {
      const emailNorm = (targetEmail || '').trim().toLowerCase();
      if (!emailNorm) return res.status(400).json({ error: 'Invalid targetEmail' });
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .ilike('email', emailNorm)
        .limit(1)
        .maybeSingle();
      if (!profile?.id) return res.status(404).json({ error: 'User not found for email' });
      userIdToUpdate = profile.id;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('org_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('user_id', userIdToUpdate);

    if (updateErr) {
      console.error('[update-org-member-role]', updateErr);
      return res.status(500).json({ error: 'Failed to update role' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[update-org-member-role]', err);
    return res.status(500).json({ error: err.message || 'Failed to update role' });
  }
}
