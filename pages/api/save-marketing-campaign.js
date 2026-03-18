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

  const { userId, organizationId, campaign } = req.body || {};
  if (!userId || !campaign) {
    return res.status(400).json({ error: 'Missing userId or campaign' });
  }

  try {
    const row = {
      user_id: userId,
      organization_id: organizationId || null,
      channel: campaign.channel || 'email',
      name: (campaign.name || '').trim(),
      subject: (campaign.subject || '').trim(),
      body: campaign.body || '',
      recipient_group: campaign.recipientGroup || 'clients',
      audience_mode: campaign.audienceMode || 'all',
      selected_recipient_ids: campaign.selectedRecipientIds || [],
      status: campaign.status || 'draft',
      audience_size: campaign.audienceSize ?? 0,
      sent_at: campaign.sentAt || null,
      error_message: campaign.errorMessage || null,
      template_type: campaign.templateType || null,
      mailchimp_template_id: campaign.mailchimpTemplateId || null,
      mailchimp_template_name: campaign.mailchimpTemplateName || null,
      custom_html: campaign.customHtml || null,
      updated_at: new Date().toISOString(),
    };

    if (campaign.id) {
      const { data, error } = await supabaseAdmin
        .from('marketing_campaigns')
        .update(row)
        .eq('id', campaign.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[save-marketing-campaign] update', error);
        return res.status(500).json({ error: 'Failed to update campaign' });
      }
      return res.status(200).json({ campaign: data });
    }

    row.created_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('marketing_campaigns')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[save-marketing-campaign] insert', error);
      return res.status(500).json({ error: 'Failed to create campaign' });
    }
    return res.status(201).json({ campaign: data });
  } catch (err) {
    console.error('[save-marketing-campaign]', err);
    return res.status(500).json({ error: 'Failed to save campaign' });
  }
}
