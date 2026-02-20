/**
 * API route to create organization invites
 * Only admins and developers can create invites
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase Admin not configured');
    supabaseAdmin = null;
  } else {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
} catch (error) {
  console.error('Failed to initialize Supabase Admin:', error);
  supabaseAdmin = null;
}

function generateInviteToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { organizationId, email, role = 'member', invitedByUserId, expiresInDays = 7 } = req.body;

  if (!organizationId || !email || !invitedByUserId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['admin', 'developer', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Verify user has permission (admin or developer)
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', invitedByUserId)
      .single();

    if (memberError || !membership || !['admin', 'developer'].includes(membership.role)) {
      return res.status(403).json({ error: 'Unauthorized: Only admins and developers can create invites' });
    }

    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('org_invites')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase().trim(),
        token,
        role,
        invited_by: invitedByUserId,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    return res.status(200).json({
      ...invite,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?invite=${token}`,
    });
  } catch (error) {
    console.error('[API] Error creating invite:', error);
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Failed to create invite'
    });
  }
}
