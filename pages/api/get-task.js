/**
 * Returns a single task by id. POST body: { userId, organizationId, taskId }
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

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error('[get-task]', error);
      return res.status(500).json({ error: 'Failed to load task' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Task not found' });
    }
    return res.status(200).json({ task: data });
  } catch (err) {
    console.error('[get-task]', err);
    return res.status(500).json({ error: 'Failed to load task' });
  }
}
