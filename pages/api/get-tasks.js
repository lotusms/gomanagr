/**
 * Returns tasks for the org, or a single task by id.
 * POST body: { userId, organizationId, taskId?, assigneeId?, status?, projectId?, clientId?, myTasks? }
 * When taskId is set, returns { task }. Otherwise returns { tasks }.
 * myTasks: true filters to assignee_id = userId.
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

  const { userId, organizationId, taskId, assigneeId, status, projectId, clientId, myTasks } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId' });
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

    let query = supabaseAdmin.from('tasks').select('*').eq('organization_id', organizationId);

    if (taskId) {
      query = query.eq('id', taskId).limit(1);
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error('[get-tasks]', error);
        return res.status(500).json({ error: 'Failed to load task' });
      }
      if (!data) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json({ task: data });
    }

    if (myTasks) {
      query = query.eq('assignee_id', userId);
    }
    if (assigneeId != null && assigneeId !== '') {
      query = query.eq('assignee_id', assigneeId);
    }
    if (status != null && status !== '') {
      query = query.eq('status', status);
    }
    if (projectId != null && projectId !== '') {
      query = query.eq('project_id', projectId);
    }
    if (clientId != null && clientId !== '') {
      query = query.or(`client_id.eq.${clientId},linked_client_id.eq.${clientId}`);
    }

    query = query
      .order('status', { ascending: true })
      .order('position', { ascending: true, nullsFirst: false })
      .order('due_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[get-tasks]', error);
      return res.status(500).json({ error: 'Failed to load tasks' });
    }

    return res.status(200).json({ tasks: data || [] });
  } catch (err) {
    console.error('[get-tasks]', err);
    return res.status(500).json({ error: 'Failed to load tasks' });
  }
}
