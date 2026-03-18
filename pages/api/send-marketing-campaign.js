/**
 * Server-side campaign sending. Handles real Mailchimp API calls with decrypted credentials.
 * POST { userId, organizationId, campaign, recipients }
 * Returns { success, messageId?, error?, campaign? }
 */
import { createClient } from '@supabase/supabase-js';
import {
  getMailchimpCredentials,
  findOrCreateList,
  batchAddMembers,
  createStaticSegment,
  createAndSendCampaign,
} from '@/lib/marketing/mailchimpApiService';

let supabaseAdmin;
try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
} catch { supabaseAdmin = null; }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, organizationId, campaign, recipients } = req.body || {};
  if (!userId || !campaign || !recipients) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const channel = campaign.channel || 'email';

  try {
    if (channel === 'email' && organizationId) {
      const creds = await getMailchimpCredentials(organizationId);
      if (creds) {
        return await handleMailchimpSend(req, res, {
          userId, organizationId, campaign, recipients, creds,
        });
      }
    }

    return res.status(200).json({
      success: false,
      error: 'No supported provider configured for server-side sending. Check your integration settings.',
    });
  } catch (err) {
    console.error('[send-marketing-campaign]', err);
    return res.status(200).json({ success: false, error: err.message || 'Send failed' });
  }
}

async function handleMailchimpSend(req, res, { userId, organizationId, campaign, recipients, creds }) {
  const { apiKey, serverPrefix, senderEmail, senderName } = creds;

  const emailRecipients = recipients.filter((r) => r.email);
  if (emailRecipients.length === 0) {
    return res.status(200).json({ success: false, error: 'No recipients with email addresses' });
  }

  const listId = await findOrCreateList(apiKey, serverPrefix, senderEmail, senderName);

  await batchAddMembers(apiKey, serverPrefix, listId, emailRecipients);

  const segmentName = `GoManagr: ${campaign.name || 'Campaign'} (${new Date().toISOString().slice(0, 16)})`;
  const emails = emailRecipients.map((r) => r.email);
  const segmentId = await createStaticSegment(apiKey, serverPrefix, listId, segmentName, emails);

  const templateId = campaign.template_type === 'mailchimp' ? campaign.mailchimp_template_id : null;
  const customHtml = campaign.template_type === 'custom_html' ? campaign.custom_html : null;
  const plainText = (!templateId && !customHtml) ? campaign.body : null;

  const result = await createAndSendCampaign(apiKey, serverPrefix, {
    listId,
    segmentId,
    subject: campaign.subject || campaign.name || '(No subject)',
    fromName: senderName || 'GoManagr',
    fromEmail: senderEmail,
    templateId: templateId || null,
    html: customHtml || null,
    plainText,
    sendImmediately: true,
  });

  if (supabaseAdmin && campaign.id) {
    await supabaseAdmin
      .from('marketing_campaigns')
      .update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id)
      .eq('user_id', userId);
  }

  return res.status(200).json({
    success: result.success,
    messageId: result.campaignId,
    error: result.error,
  });
}
