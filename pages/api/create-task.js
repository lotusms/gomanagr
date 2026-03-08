/**
 * Creates a task. POST body: { userId, organizationId, task_number?, ...taskFields }
 * Task fields: title, description, status, priority, assignee_id, due_at, project_id, client_id,
 * task_number (optional; auto-generated with TASK prefix if omitted),
 * linked_*. userId and assignee_id are normalized to raw UUID (strips owner- prefix).
 */

const { createClient } = require('@supabase/supabase-js');
const { formatDocumentId, parseDocumentId } = require('@/lib/documentIdsServer');

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
const TASK_DOC_PREFIX = 'TASK';

/** Strip optional prefix (e.g. owner-, auth-) and return raw UUID for Supabase UUID columns. */
function toRawUuid(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const match = s.match(/^(?:owner-|auth-)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (match) return match[1];
  const fallback = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return fallback ? fallback[0] : null;
}

function parseBody(body) {
  const status = STATUSES.includes(String(body.status || '').toLowerCase())
    ? String(body.status).toLowerCase().replace(/\s+/g, '_')
    : 'to_do';
  const priority = PRIORITIES.includes(String(body.priority || '').toLowerCase())
    ? String(body.priority).toLowerCase()
    : 'medium';
  const title = String(body.title ?? '').trim();
  const rawCreatedBy = toRawUuid(body.userId);
  const rawAssigneeId = toRawUuid(body.assignee_id ?? body.assigneeId);
  return {
    organization_id: body.organizationId,
    project_id: body.project_id ?? body.projectId ?? null,
    client_id: body.client_id ?? body.clientId ?? null,
    title: title || 'Untitled task',
    description: body.description != null ? String(body.description).trim() || null : null,
    status,
    priority,
    assignee_id: rawAssigneeId,
    due_at: body.due_at ?? body.dueAt ?? null,
    position: body.position != null ? Number(body.position) : null,
    linked_client_id: body.linked_client_id ?? body.linkedClientId ?? null,
    linked_project_id: body.linked_project_id ?? body.linkedProjectId ?? null,
    linked_invoice_id: body.linked_invoice_id ?? body.linkedInvoiceId ?? null,
    linked_proposal_id: body.linked_proposal_id ?? body.linkedProposalId ?? null,
    linked_appointment_id: body.linked_appointment_id ?? body.linkedAppointmentId ?? null,
    created_by: rawCreatedBy,
    task_number: body.task_number != null && String(body.task_number).trim() !== '' ? String(body.task_number).trim() : undefined,
    subtasks: Array.isArray(body.subtasks) ? body.subtasks : [],
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId } = req.body || {};
  if (!userId || !organizationId) {
    return res.status(400).json({ error: 'Missing userId or organizationId' });
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

    const row = parseBody(req.body);
    if (!row.created_by) {
      return res.status(400).json({ error: 'Invalid userId: could not resolve UUID' });
    }
    if (row.organization_id !== organizationId) {
      return res.status(400).json({ error: 'organization_id must match organizationId' });
    }

    if (row.task_number === undefined) {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      let orgPrefix = 'PER';
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id_prefix, name')
        .eq('id', organizationId)
        .limit(1)
        .single();
      if (org) {
        const raw = (org.id_prefix || '').trim().toUpperCase().slice(0, 3);
        orgPrefix = raw.length >= 3 ? raw : (org.name || '')
          .replace(/[^a-zA-Z]/g, '')
          .toUpperCase()
          .slice(0, 3)
          .padEnd(3, 'X');
      }
      const { data: existing } = await supabaseAdmin
        .from('tasks')
        .select('task_number')
        .eq('organization_id', organizationId);
      let maxSeq = 0;
      for (const r of (existing || [])) {
        if (!r.task_number) continue;
        const parsed = parseDocumentId(r.task_number);
        if (parsed && parsed.docPrefix === TASK_DOC_PREFIX && parsed.sequence > maxSeq) {
          maxSeq = parsed.sequence;
        }
      }
      row.task_number = formatDocumentId(orgPrefix, TASK_DOC_PREFIX, datePart, maxSeq + 1);
    }

    const { data, error } = await supabaseAdmin.from('tasks').insert(row).select('*').single();

    if (error) {
      console.error('[create-task]', error);
      return res.status(500).json({ error: 'Failed to create task' });
    }
    await supabaseAdmin.from('task_activity').insert({
      task_id: data.id,
      organization_id: organizationId,
      kind: 'created',
      new_value: data.title || null,
      user_id: row.created_by,
    }).then(() => {});
    return res.status(200).json({ task: data });
  } catch (err) {
    console.error('[create-task]', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
}
