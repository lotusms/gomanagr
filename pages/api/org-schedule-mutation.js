/**
 * Save or delete an appointment in the org's schedule (admin's user_profiles.appointments).
 * - Admin (userId === org admin): can save/delete any appointment.
 * - Team member: can only save appointments for themselves (staffId forced to their id)
 *   and only delete their own appointments (staffId must match).
 * All changes are persisted to the admin's profile so admin and team member views stay in sync.
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

  const { userId, action, appointment, appointmentId } = req.body || {};
  if (!userId || !action) {
    return res.status(400).json({ error: 'Missing userId or action' });
  }
  if (action !== 'save' && action !== 'delete') {
    return res.status(400).json({ error: 'Action must be save or delete' });
  }
  if (action === 'save' && !appointment) {
    return res.status(400).json({ error: 'Missing appointment for save' });
  }
  if (action === 'delete' && !appointmentId) {
    return res.status(400).json({ error: 'Missing appointmentId for delete' });
  }

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (memErr || !membership?.organization_id) {
      return res.status(403).json({ error: 'Not a member of an organization' });
    }

    const orgId = membership.organization_id;
    const { data: adminRows } = await supabaseAdmin
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1);

    if (!adminRows?.length) {
      return res.status(500).json({ error: 'No admin found for organization' });
    }

    const adminUserId = adminRows[0].user_id;
    const isAdmin = userId === adminUserId;

    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('appointments')
      .eq('id', adminUserId)
      .single();

    if (profileErr || !profileRow) {
      return res.status(500).json({ error: 'Failed to load schedule' });
    }

    let appointments = Array.isArray(profileRow.appointments) ? [...profileRow.appointments] : [];
    let memberId = null;

    if (!isAdmin) {
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authErr || !authUser?.user?.email) {
        return res.status(404).json({ error: 'User not found' });
      }
      const emailNorm = (authUser.user.email || '').trim().toLowerCase();
      const { data: adminProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('team_members')
        .eq('id', adminUserId)
        .single();
      const me = (adminProfile?.team_members || []).find(
        (m) => (m.email || '').trim().toLowerCase() === emailNorm
      );
      if (!me?.id) {
        return res.status(403).json({ error: 'Team member record not found' });
      }
      memberId = me.id;
    }

    if (action === 'save') {
      let apt = { ...appointment };
      if (!isAdmin) {
        apt.staffId = memberId;
      }
      appointments = appointments.filter((a) => a.id !== apt.id);
      appointments.push(apt);
    } else {
      const existing = appointments.find((a) => a.id === appointmentId);
      if (!existing) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      if (!isAdmin && String(existing.staffId) !== String(memberId)) {
        return res.status(403).json({ error: 'You can only delete your own appointments' });
      }
      appointments = appointments.filter((a) => a.id !== appointmentId);
    }

    const { error: updateErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        appointments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminUserId);

    if (updateErr) {
      console.error('[org-schedule-mutation]', updateErr);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[org-schedule-mutation]', err);
    return res.status(500).json({ error: 'Failed to update schedule' });
  }
}
