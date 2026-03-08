/**
 * Adds a comment to a task. POST body: { userId, organizationId, taskId, body }
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId, taskId, body } = req.body || {};
  if (!userId || !organizationId || !taskId) {
    return res.status(400).json({ error: 'Missing userId, organizationId, or taskId' });
  }

  const actorId = toRawUuid(userId);
  if (!actorId) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  const commentBody = body != null ? String(body).trim() : '';
  if (!commentBody) {
    return res.status(400).json({ error: 'Comment body is required' });
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
      .from('task_comments')
      .insert({
        task_id: taskId,
        organization_id: organizationId,
        user_id: actorId,
        body: commentBody,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[add-task-comment]', error);
      return res.status(500).json({ error: 'Failed to add comment' });
    }
    return res.status(200).json({ comment: data });
  } catch (err) {
    console.error('[add-task-comment]', err);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
}
