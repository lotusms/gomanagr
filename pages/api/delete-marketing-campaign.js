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
    const { error } = await supabaseAdmin
      .from('marketing_campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('user_id', userId);

    if (error) {
      console.error('[delete-marketing-campaign]', error);
      return res.status(500).json({ error: 'Failed to delete campaign' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-marketing-campaign]', err);
    return res.status(500).json({ error: 'Failed to delete campaign' });
  }
}
