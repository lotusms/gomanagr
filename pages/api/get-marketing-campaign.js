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

  const { userId, campaignId } = req.body || {};
  if (!userId || !campaignId) {
    return res.status(400).json({ error: 'Missing userId or campaignId' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (data.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ campaign: data });
  } catch (err) {
    console.error('[get-marketing-campaign]', err);
    return res.status(500).json({ error: 'Failed to load campaign' });
  }
}
