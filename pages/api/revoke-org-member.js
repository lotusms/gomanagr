/**
 * Revoke a member's access: remove from org_members (if joined), delete auth user (so they cannot
 * log in or reset password), mark all their invite links as used (so they cannot create a login),
 * and send them an email that access has been revoked. Only org admins can revoke.
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

/** Returns true if the revoked-access email was sent, false otherwise. */
async function sendRevokedEmail(to, memberName, orgName, baseUrl) {
  const body = JSON.stringify({
    to: to.trim(),
    memberName: memberName || undefined,
    orgName: orgName || undefined,
  });
  try {
    const url = `${baseUrl}/api/send-revoked-access-email`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[revoke-org-member] send-revoked-access-email error', res.status, data);
      return false;
    }
    if (data.sent) {
      return true;
    }
    console.warn('[revoke-org-member] send-revoked-access-email not sent (no provider?)', data.message || data);
    return false;
  } catch (e) {
    console.error('[revoke-org-member] send-revoked-access-email fetch', e);
    return false;
  }
}

/** Find Supabase Auth user by email (paginate listUsers). Returns { id, email } or null. */
async function findAuthUserByEmail(emailNorm) {
  let page = 1;
  const perPage = 50;
  const maxPages = 20;
  while (page <= maxPages) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('[revoke-org-member] listUsers', error);
      return null;
    }
    const user = (data?.users || []).find((u) => (u.email || '').toLowerCase().trim() === emailNorm);
    if (user) return { id: user.id, email: (user.email || '').toLowerCase().trim() };
    if (!data?.users?.length || data.users.length < perPage) return null;
    page++;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, email, organizationId, callerUserId, memberName } = req.body || {};
  const emailNorm = (email || '').toLowerCase().trim();
  if (!emailNorm && !userId) {
    return res.status(400).json({ error: 'Missing email or userId' });
  }
  if (!organizationId || !callerUserId) {
    return res.status(400).json({ error: 'Missing organizationId or callerUserId' });
  }

  if (userId && userId === callerUserId) {
    return res.status(400).json({ error: 'You cannot revoke your own access' });
  }

  try {
    const { data: callerMembership, error: callerErr } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', callerUserId)
      .single();

    if (callerErr || !callerMembership || !['superadmin', 'admin', 'developer'].includes(callerMembership.role)) {
      return res.status(403).json({ error: 'Only organization admins can revoke access' });
    }

    let revokeEmail = emailNorm;
    let targetUserId = userId;
    if (!targetUserId && revokeEmail) {
      const authUser = await findAuthUserByEmail(revokeEmail);
      if (authUser) targetUserId = authUser.id;
    }
    if (targetUserId && targetUserId === callerUserId) {
      return res.status(400).json({ error: 'You cannot revoke your own access' });
    }

    if (targetUserId) {
      const { error: deleteMemberErr } = await supabaseAdmin
        .from('org_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', targetUserId);

      if (deleteMemberErr) {
        console.error('[revoke-org-member] delete org_members', deleteMemberErr);
        return res.status(500).json({ error: 'Failed to remove member from organization' });
      }

      const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (deleteAuthErr) {
        console.error('[revoke-org-member] deleteUser', deleteAuthErr);
        return res.status(500).json({
          error: 'Member was removed from the organization but their login could not be revoked. They may still sign in until their session expires.',
        });
      }

      if (!revokeEmail) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('email')
          .eq('id', targetUserId)
          .single();
        revokeEmail = (profile?.email || '').toLowerCase().trim();
      }
    }

    const { data: orgRow } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();
    const orgName = orgRow?.name || null;

    if (revokeEmail) {
      const { error: inviteErr } = await supabaseAdmin
        .from('org_invites')
        .delete()
        .eq('organization_id', organizationId)
        .ilike('email', revokeEmail);
      if (inviteErr) {
        console.error('[revoke-org-member] delete org_invites', inviteErr);
      }

      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`).replace(/\/$/, '');
      const emailSent = await sendRevokedEmail(revokeEmail, memberName, orgName, baseUrl);
      if (!emailSent) {
        console.warn('[revoke-org-member] Revoked user may not have received email. Configure SMTP_* or RESEND_API_KEY.');
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[revoke-org-member]', err);
    return res.status(500).json({ error: err.message || 'Failed to revoke access' });
  }
}
