/**
 * Server-side Mailchimp Marketing API v3 service.
 * Handles: template listing, audience management, campaign creation, and sending.
 * Use only in API routes — requires decrypted API credentials.
 */

import { getOrgIntegration } from '@/lib/integrations/get-org-integration';

/**
 * Build base URL for a given Mailchimp server prefix.
 * @param {string} serverPrefix e.g. "us21"
 */
function baseUrl(serverPrefix) {
  return `https://${serverPrefix.toLowerCase()}.api.mailchimp.com/3.0`;
}

/**
 * Make an authenticated request to the Mailchimp API.
 */
async function mcFetch(apiKey, serverPrefix, path, options = {}) {
  const url = `${baseUrl(serverPrefix)}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    const msg = json?.detail || json?.title || text || `HTTP ${res.status}`;
    throw new Error(`Mailchimp API error (${res.status}): ${msg}`);
  }
  return json;
}

/**
 * Get decrypted Mailchimp credentials for an organization.
 * @param {string} organizationId
 * @returns {Promise<{ apiKey: string, serverPrefix: string, senderEmail: string, senderName: string } | null>}
 */
export async function getMailchimpCredentials(organizationId) {
  if (!organizationId) return null;
  const result = await getOrgIntegration(organizationId, 'mailchimp');
  if (!result?.config) return null;
  const { apiKey, serverPrefix, senderEmail, senderName } = result.config;
  if (!apiKey || !serverPrefix) return null;
  return {
    apiKey: String(apiKey).trim(),
    serverPrefix: String(serverPrefix).trim(),
    senderEmail: senderEmail ? String(senderEmail).trim() : '',
    senderName: senderName ? String(senderName).trim() : '',
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * List the user's Mailchimp templates (type=user, plus gallery if desired).
 * @returns {Promise<Array<{ id: number, name: string, type: string, thumbnail: string, date_created: string }>>}
 */
export async function listTemplates(apiKey, serverPrefix) {
  const data = await mcFetch(apiKey, serverPrefix, '/templates?type=user&count=100&sort_field=date_edited&sort_dir=DESC');
  return (data?.templates || []).map((t) => ({
    id: t.id,
    name: t.name || 'Untitled',
    type: t.type || 'user',
    thumbnail: t.thumbnail || '',
    date_created: t.date_created || '',
    active: t.active !== false,
  }));
}

// ---------------------------------------------------------------------------
// Audience / List management
// ---------------------------------------------------------------------------

const GOMANAGR_LIST_NAME = 'GoManagr Contacts';

/**
 * Find or create the GoManagr audience/list in Mailchimp.
 * @returns {Promise<string>} list_id
 */
export async function findOrCreateList(apiKey, serverPrefix, senderEmail, senderName) {
  const data = await mcFetch(apiKey, serverPrefix, '/lists?count=100&fields=lists.id,lists.name');
  const existing = (data?.lists || []).find((l) => l.name === GOMANAGR_LIST_NAME);
  if (existing) return existing.id;

  const created = await mcFetch(apiKey, serverPrefix, '/lists', {
    method: 'POST',
    body: JSON.stringify({
      name: GOMANAGR_LIST_NAME,
      contact: {
        company: senderName || 'GoManagr User',
        address1: '123 Main St',
        city: 'Anytown',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      permission_reminder: 'You are receiving this because you are a contact of our business.',
      campaign_defaults: {
        from_name: senderName || 'GoManagr',
        from_email: senderEmail,
        subject: '',
        language: 'en',
      },
      email_type_option: false,
    }),
  });
  return created.id;
}

/**
 * Batch add/update members in a Mailchimp list.
 * @param {Array<{ email: string, firstName?: string, lastName?: string }>} members
 */
export async function batchAddMembers(apiKey, serverPrefix, listId, members) {
  const mcMembers = members
    .filter((m) => m.email)
    .map((m) => ({
      email_address: m.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: m.firstName || m.name?.split(' ')[0] || '',
        LNAME: m.lastName || m.name?.split(' ').slice(1).join(' ') || '',
      },
    }));
  if (mcMembers.length === 0) return;
  await mcFetch(apiKey, serverPrefix, `/lists/${listId}`, {
    method: 'POST',
    body: JSON.stringify({ members: mcMembers, update_existing: true }),
  });
}

/**
 * Create a static segment for this campaign's recipients.
 * @param {string[]} emails
 * @returns {Promise<number>} segment ID
 */
export async function createStaticSegment(apiKey, serverPrefix, listId, segmentName, emails) {
  const data = await mcFetch(apiKey, serverPrefix, `/lists/${listId}/segments`, {
    method: 'POST',
    body: JSON.stringify({
      name: segmentName,
      static_segment: emails,
    }),
  });
  return data.id;
}

/**
 * Create a Mailchimp campaign, set content, and optionally send it.
 *
 * @param {object} opts
 * @param {string} opts.listId
 * @param {number} opts.segmentId
 * @param {string} opts.subject
 * @param {string} opts.fromName
 * @param {string} opts.fromEmail
 * @param {number|null} opts.templateId - Mailchimp template ID
 * @param {string|null} opts.html - custom HTML (when no templateId)
 * @param {string|null} opts.plainText - plain text fallback body
 * @param {boolean} [opts.sendImmediately=true]
 * @returns {Promise<{ campaignId: string, success: boolean, error?: string }>}
 */
export async function createAndSendCampaign(apiKey, serverPrefix, opts) {
  const {
    listId,
    segmentId,
    subject,
    fromName,
    fromEmail,
    templateId,
    html,
    plainText,
    sendImmediately = true,
  } = opts;

  const campaign = await mcFetch(apiKey, serverPrefix, '/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      type: 'regular',
      recipients: {
        list_id: listId,
        segment_opts: { saved_segment_id: segmentId },
      },
      settings: {
        subject_line: subject || '(No subject)',
        from_name: fromName || 'GoManagr',
        reply_to: fromEmail,
      },
    }),
  });

  const mcCampaignId = campaign.id;

  const contentBody = {};
  if (templateId) {
    contentBody.template = { id: templateId };
  } else if (html) {
    contentBody.html = html;
  } else if (plainText) {
    contentBody.html = `<html><body><pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(plainText)}</pre></body></html>`;
  }

  if (Object.keys(contentBody).length > 0) {
    await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`, {
      method: 'PUT',
      body: JSON.stringify(contentBody),
    });
  }

  if (sendImmediately) {
    await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/actions/send`, {
      method: 'POST',
    });
  }

  return { campaignId: mcCampaignId, success: true };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
