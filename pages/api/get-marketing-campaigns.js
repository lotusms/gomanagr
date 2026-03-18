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
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId, channel } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    let query = supabaseAdmin
      .from('marketing_campaigns')
      .select('*')
      .order('updated_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[get-marketing-campaigns]', error);
      return res.status(500).json({ error: 'Failed to load campaigns' });
    }

    return res.status(200).json({ campaigns: data || [] });
  } catch (err) {
    console.error('[get-marketing-campaigns]', err);
    return res.status(500).json({ error: 'Failed to load campaigns' });
  }
}
