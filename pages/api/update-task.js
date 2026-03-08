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
  if (body.labels !== undefined) updates.labels = Array.isArray(body.labels) ? body.labels : [];
  if (body.task_number !== undefined) updates.task_number = body.task_number != null && String(body.task_number).trim() !== '' ? String(body.task_number).trim() : null;
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
    return res.status(200).json({ task: data });
  } catch (err) {
    console.error('[update-task]', err);
    return res.status(500).json({ error: 'Failed to update task' });
  }
}
