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

  if (!senderEmail) {
    return res.status(200).json({
      success: false,
      error: 'Mailchimp sender email is not configured. Go to Settings > Integrations > Mailchimp and enter a Sender Email address.',
    });
  }

  const emailRecipients = recipients.filter((r) => r.email);
  if (emailRecipients.length === 0) {
    return res.status(200).json({ success: false, error: 'No recipients with email addresses' });
  }

  let listId;
  try {
    listId = await findOrCreateList(apiKey, serverPrefix, senderEmail, senderName);
  } catch (err) {
    console.error('[send-marketing-campaign] findOrCreateList failed:', err.message);
    return res.status(200).json({ success: false, error: `Failed to set up Mailchimp audience: ${err.message}` });
  }

  let batchResult;
  try {
    batchResult = await batchAddMembers(apiKey, serverPrefix, listId, emailRecipients);
  } catch (err) {
    console.error('[send-marketing-campaign] batchAddMembers failed:', err.message);
    return res.status(200).json({ success: false, error: `Failed to add recipients to Mailchimp audience: ${err.message}` });
  }

  const totalAdded = (batchResult?.total_created ?? 0) + (batchResult?.total_updated ?? 0);
  if (totalAdded === 0 && emailRecipients.length > 0) {
    return res.status(200).json({
      success: false,
      error: `None of the ${emailRecipients.length} recipients could be added to the Mailchimp audience. They may have previously unsubscribed or been cleaned.`,
    });
  }

  let segmentId;
  try {
    const segmentName = `GoManagr: ${campaign.name || 'Campaign'} (${new Date().toISOString().slice(0, 16)})`;
    const emails = emailRecipients.map((r) => r.email);
    segmentId = await createStaticSegment(apiKey, serverPrefix, listId, segmentName, emails);
  } catch (err) {
    console.error('[send-marketing-campaign] createStaticSegment failed:', err.message);
    return res.status(200).json({ success: false, error: `Failed to create recipient segment in Mailchimp: ${err.message}` });
  }

  const templateId = campaign.template_type === 'mailchimp' ? campaign.mailchimp_template_id : null;
  const customHtml = campaign.template_type === 'custom_html' ? campaign.custom_html : null;
  const plainText = campaign.body || null;

  let result;
  try {
    result = await createAndSendCampaign(apiKey, serverPrefix, {
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
  } catch (err) {
    console.error('[send-marketing-campaign] createAndSendCampaign failed:', err.message);
    result = { success: false, error: `Mailchimp campaign send failed: ${err.message}` };
  }

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
