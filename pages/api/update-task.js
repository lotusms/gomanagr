/**
 * Updates a task (full or partial). POST body: { userId, organizationId, taskId, ...taskFields }
 * assignee_id is normalized to raw UUID (strips owner- prefix) for Supabase.
 */

const { createClient } = require('@supabase/supabase-js');

function toRawUuid(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const match = s.match(/^(?:owner-|auth-)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (match) return match[1];
  const fallback = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return fallback ? fallback[0] : null;
}

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

const STATUSES = ['backlog', 'to_do', 'in_progress', 'blocked', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/** Normalize due_at to YYYY-MM-DD for comparison so we only log activity when the date actually changed. */
function dueAtDateOnly(iso) {
  if (iso == null || iso === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildUpdate(body) {
  const updates = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = String(body.title).trim() || 'Untitled task';
  if (body.description !== undefined) updates.description = body.description == null || body.description === '' ? null : String(body.description).trim();
  if (body.status !== undefined && STATUSES.includes(String(body.status).toLowerCase().replace(/\s+/g, '_'))) {
    updates.status = String(body.status).toLowerCase().replace(/\s+/g, '_');
  }
  if (body.priority !== undefined && PRIORITIES.includes(String(body.priority).toLowerCase())) {
    updates.priority = String(body.priority).toLowerCase();
  }
  if (body.assignee_id !== undefined) updates.assignee_id = toRawUuid(body.assignee_id) ?? null;
  if (body.assigneeId !== undefined) updates.assignee_id = toRawUuid(body.assigneeId) ?? updates.assignee_id ?? null;
  if (body.due_at !== undefined) updates.due_at = body.due_at || null;
  if (body.dueAt !== undefined) updates.due_at = body.dueAt || null;
  if (body.duration_days !== undefined) updates.duration_days = body.duration_days == null ? null : Math.max(0, parseInt(body.duration_days, 10) || 0) || null;
  if (body.durationDays !== undefined) updates.duration_days = body.durationDays == null ? null : Math.max(0, parseInt(body.durationDays, 10) || 0) || null;
  if (body.start_date !== undefined) updates.start_date = body.start_date && String(body.start_date).trim() ? String(body.start_date).trim().slice(0, 10) : null;
  if (body.startDate !== undefined) updates.start_date = body.startDate && String(body.startDate).trim() ? String(body.startDate).trim().slice(0, 10) : null;
  if (body.position !== undefined) updates.position = body.position == null ? null : Number(body.position);
  if (body.project_id !== undefined) updates.project_id = body.project_id || null;
  if (body.projectId !== undefined) updates.project_id = body.projectId || null;
  if (body.client_id !== undefined) updates.client_id = body.client_id || null;
  if (body.clientId !== undefined) updates.client_id = body.clientId || null;
  if (body.linked_client_id !== undefined) updates.linked_client_id = body.linked_client_id || null;
  if (body.linked_project_id !== undefined) updates.linked_project_id = body.linked_project_id || null;
  if (body.linked_invoice_id !== undefined) updates.linked_invoice_id = body.linked_invoice_id || null;
  if (body.linked_proposal_id !== undefined) updates.linked_proposal_id = body.linked_proposal_id || null;
  if (body.linked_appointment_id !== undefined) updates.linked_appointment_id = body.linked_appointment_id || null;
  if (body.task_number !== undefined) updates.task_number = body.task_number != null && String(body.task_number).trim() !== '' ? String(body.task_number).trim() : null;
  if (body.subtasks !== undefined) updates.subtasks = Array.isArray(body.subtasks) ? body.subtasks : [];
  return updates;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId, taskId } = req.body || {};
  if (!userId || !organizationId || !taskId) {
    return res.status(400).json({ error: 'Missing userId, organizationId, or taskId' });
  }

  const actorId = toRawUuid(userId);

  try {
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

    const updates = buildUpdate(req.body);
    if (Object.keys(updates).length <= 1) {
      const { data: existing } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json({ task: existing });
    }

    const { data: existing } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      console.error('[update-task]', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (actorId) {
      const activityRows = [];
      if (updates.status !== undefined && updates.status !== existing.status) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'status', old_value: existing.status, new_value: updates.status, user_id: actorId });
      }
      if (updates.assignee_id !== undefined && updates.assignee_id !== existing.assignee_id) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'assignee', old_value: existing.assignee_id, new_value: updates.assignee_id, user_id: actorId });
      }
      if (updates.due_at !== undefined && dueAtDateOnly(updates.due_at) !== dueAtDateOnly(existing.due_at)) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'due_at', old_value: existing.due_at, new_value: updates.due_at, user_id: actorId });
      }
      if (updates.title !== undefined && updates.title !== existing.title) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'title', old_value: existing.title, new_value: updates.title, user_id: actorId });
      }
      if (updates.priority !== undefined && updates.priority !== existing.priority) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'priority', old_value: existing.priority, new_value: updates.priority, user_id: actorId });
      }
      if (updates.client_id !== undefined && updates.client_id !== existing.client_id) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'client', old_value: existing.client_id, new_value: updates.client_id, user_id: actorId });
      }
      if (updates.project_id !== undefined && updates.project_id !== existing.project_id) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'project', old_value: existing.project_id, new_value: updates.project_id, user_id: actorId });
      }
      if (updates.duration_days !== undefined && String(updates.duration_days) !== String(existing.duration_days ?? '')) {
        activityRows.push({ task_id: taskId, organization_id: organizationId, kind: 'duration_days', old_value: existing.duration_days != null ? String(existing.duration_days) : null, new_value: updates.duration_days != null ? String(updates.duration_days) : null, user_id: actorId });
      }
      if (activityRows.length > 0) {
        await supabaseAdmin.from('task_activity').insert(activityRows).then(() => {});
      }
    }

    return res.status(200).json({ task: data });
  } catch (err) {
    console.error('[update-task]', err);
    return res.status(500).json({ error: 'Failed to update task' });
  }
}
