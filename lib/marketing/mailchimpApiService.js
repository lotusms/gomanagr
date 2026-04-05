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
 * List saved (user) Mailchimp templates with pagination. Matches "Saved" in Mailchimp UI.
 * @returns {Promise<Array<{ id: number, name: string, type: string, thumbnail: string, date_created: string, date_edited: string }>>}
 */
export async function listTemplates(apiKey, serverPrefix) {
  const count = 100;
  const seen = new Set();
  const all = [];
  let offset = 0;

  for (;;) {
    const path =
      `/templates?type=user&count=${count}&offset=${offset}` +
      '&sort_field=date_edited&sort_dir=DESC';
    let data;
    try {
      data = await mcFetch(apiKey, serverPrefix, path);
    } catch (e) {
      if (offset === 0) {
        const fallbackPath = `/templates?type=user&count=${count}&offset=0`;
        data = await mcFetch(apiKey, serverPrefix, fallbackPath);
      } else {
        throw e;
      }
    }
    const batch = data?.templates || [];
    for (const t of batch) {
      if (!t?.id || seen.has(t.id)) continue;
      seen.add(t.id);
      all.push({
        id: t.id,
        name: t.name || 'Untitled',
        type: t.type || 'user',
        thumbnail: t.thumbnail || '',
        date_created: t.date_created || '',
        date_edited: t.date_edited || t.date_created || '',
        active: t.active !== false,
      });
    }
    if (batch.length < count) break;
    offset += count;
    if (offset > 10000) break;
  }

  return all;
}

/**
 * Load HTML for a template (for listing in GoManagr compose). Tries GET template, then default-content.
 * New email-builder templates may return little or no HTML — callers should fall back to plain body.
 * @returns {Promise<{ html: string, available: boolean }>}
 */
export async function fetchTemplateHtml(apiKey, serverPrefix, templateId) {
  const id = Number(templateId);
  if (!Number.isFinite(id)) {
    return { html: '', available: false };
  }

  let html = '';
  try {
    const tpl = await mcFetch(apiKey, serverPrefix, `/templates/${id}`);
    html = (tpl?.html || '').trim();
  } catch (_) {
    /* continue */
  }

  if (html.length <= 50) {
    try {
      const dc = await mcFetch(apiKey, serverPrefix, `/templates/${id}/default-content`);
      html = (dc?.html || '').trim();
      if (html.length <= 50 && dc?.sections && typeof dc.sections === 'object') {
        const parts = Object.values(dc.sections).map((s) => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            return s.content || s.html || s.value || '';
          }
          return '';
        });
        html = parts.filter(Boolean).join('\n').trim();
      }
    } catch (_) {
      /* continue */
    }
  }

  return { html, available: html.length > 50 };
}

// ---------------------------------------------------------------------------
// Audience / List management
// ---------------------------------------------------------------------------

const GOMANAGR_LIST_NAME = 'GoManagr Contacts';

/**
 * Find or create the GoManagr audience/list in Mailchimp, then ensure its
 * campaign_defaults are up to date with the current sender info.
 * @returns {Promise<string>} list_id
 */
export async function findOrCreateList(apiKey, serverPrefix, senderEmail, senderName) {
  const data = await mcFetch(apiKey, serverPrefix, '/lists?count=100&fields=lists.id,lists.name');
  const existing = (data?.lists || []).find((l) => l.name === GOMANAGR_LIST_NAME);

  if (existing) {
    console.log('[mailchimp] Updating existing list', existing.id, 'campaign_defaults with from_email:', senderEmail);
    const patchResult = await mcFetch(apiKey, serverPrefix, `/lists/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        campaign_defaults: {
          from_name: senderName || 'GoManagr',
          from_email: senderEmail,
          subject: '',
          language: 'en',
        },
      }),
    });
    console.log('[mailchimp] List PATCH result defaults:', JSON.stringify(patchResult?.campaign_defaults));
    return existing.id;
  }

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
 * Uses status_if_new so existing contacts keep their current status while
 * new contacts are added as subscribed.
 * @param {Array<{ email: string, firstName?: string, lastName?: string }>} members
 * @returns {Promise<{ total_created: number, total_updated: number, error_count: number }>}
 */
export async function batchAddMembers(apiKey, serverPrefix, listId, members) {
  const mcMembers = members
    .filter((m) => m.email)
    .map((m) => ({
      email_address: m.email,
      status_if_new: 'subscribed',
      merge_fields: {
        FNAME: m.firstName || m.name?.split(' ')[0] || '',
        LNAME: m.lastName || m.name?.split(' ').slice(1).join(' ') || '',
      },
    }));
  if (mcMembers.length === 0) return { total_created: 0, total_updated: 0, error_count: 0 };
  console.log(`[mailchimp] Adding ${mcMembers.length} members to list ${listId}`);
  const result = await mcFetch(apiKey, serverPrefix, `/lists/${listId}`, {
    method: 'POST',
    body: JSON.stringify({ members: mcMembers, update_existing: true }),
  });
  console.log('[mailchimp] Batch result:', JSON.stringify({
    total_created: result?.total_created,
    total_updated: result?.total_updated,
    error_count: result?.error_count,
    errors: (result?.errors || []).slice(0, 3),
  }));
  return {
    total_created: result?.total_created ?? 0,
    total_updated: result?.total_updated ?? 0,
    error_count: result?.error_count ?? 0,
  };
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

  const campaignPayload = {
    type: 'regular',
    recipients: {
      list_id: listId,
      segment_opts: { saved_segment_id: segmentId },
    },
    settings: {
      title: `GoManagr: ${subject || 'Campaign'} ${Date.now()}`,
      subject_line: subject || '(No subject)',
      from_name: fromName || 'GoManagr',
      reply_to: fromEmail,
      to_name: '*|FNAME|*',
    },
    tracking: {
      opens: true,
      html_clicks: true,
      text_clicks: true,
    },
  };

  console.log('[mailchimp] Creating campaign with payload:', JSON.stringify(campaignPayload, null, 2));

  const campaign = await mcFetch(apiKey, serverPrefix, '/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignPayload),
  });

  console.log('[mailchimp] Campaign created:', JSON.stringify({
    id: campaign.id,
    settings: campaign.settings,
    recipients: campaign.recipients,
    tracking: campaign.tracking,
  }, null, 2));

  const mcCampaignId = campaign.id;

  const numericTemplateId = templateId ? Number(templateId) : null;
  let contentStrategy = 'none';
  let resolvedHtml = '';

  if (numericTemplateId) {
    // Edited HTML from GoManagr compose (saved in custom_html while template_type = mailchimp) wins over API fetch.
    if (html && html.trim().length > 50) {
      contentStrategy = 'mailchimp-edited-html';
      await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`, {
        method: 'PUT',
        body: JSON.stringify({ html: ensureUnsubLink(html) }),
      });
    } else {
      // Strategy 1: fetch the template object itself for the source HTML
      try {
        const tplObj = await mcFetch(apiKey, serverPrefix, `/templates/${numericTemplateId}`);
        resolvedHtml = tplObj?.html || '';
      } catch (_) { /* continue */ }

      // Strategy 2: try default-content endpoint
      if (resolvedHtml.trim().length <= 50) {
        try {
          const tplContent = await mcFetch(apiKey, serverPrefix, `/templates/${numericTemplateId}/default-content`);
          resolvedHtml = tplContent?.html || '';
          if (resolvedHtml.trim().length <= 50 && tplContent?.sections && typeof tplContent.sections === 'object') {
            const parts = Object.values(tplContent.sections).map((s) => {
              if (typeof s === 'string') return s;
              if (s && typeof s === 'object') {
                return s.content || s.html || s.value || '';
              }
              return '';
            });
            resolvedHtml = parts.filter(Boolean).join('\n');
          }
        } catch (_) { /* continue */ }
      }

      if (resolvedHtml.trim().length > 50) {
        contentStrategy = 'template-html';
        await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`, {
          method: 'PUT',
          body: JSON.stringify({ html: ensureUnsubLink(resolvedHtml) }),
        });
      } else {
        // Strategy 3: template reference (works for classic code-based templates)
        contentStrategy = 'template-ref';
        await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`, {
          method: 'PUT',
          body: JSON.stringify({ template: { id: numericTemplateId } }),
        });
      }
    }
  }

  if (!numericTemplateId || contentStrategy === 'none') {
    if (html) {
      contentStrategy = 'custom-html';
      await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`, {
        method: 'PUT',
        body: JSON.stringify({ html: ensureUnsubLink(html) }),
      });
    } else if (plainText) {
      contentStrategy = 'plain-text';
      await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`, {
        method: 'PUT',
        body: JSON.stringify({
          html: ensureUnsubLink(
            `<html><body><div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(plainText)}</div></body></html>`
          ),
        }),
      });
    }
  }

  if (sendImmediately) {
    const verifyContent = await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`);
    const verifiedLen = (verifyContent?.html || '').trim().length;

    if (verifiedLen <= 50 && plainText) {
      contentStrategy = 'fallback-plain-text';
      await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/content`, {
        method: 'PUT',
        body: JSON.stringify({
          html: ensureUnsubLink(
            `<html><body><div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(plainText)}</div></body></html>`
          ),
        }),
      });
    } else if (verifiedLen <= 50) {
      throw new Error(
        `Campaign content is empty after setting it (strategy: ${contentStrategy}, ` +
        `templateId: ${numericTemplateId || 'none'}). ` +
        `Your Mailchimp template may use the new email builder which has limited API support. ` +
        `Try using "Plain text" or "Custom HTML" instead of a Mailchimp template.`
      );
    }

    await mcFetch(apiKey, serverPrefix, `/campaigns/${mcCampaignId}/actions/send`, {
      method: 'POST',
    });
  }

  return { campaignId: mcCampaignId, success: true };
}

function ensureUnsubLink(html) {
  if (/\*\|UNSUB(:\w+)?\|\*/.test(html)) return html;
  const unsubBlock =
    '<div style="text-align:center;padding:20px 0;font-size:12px;color:#999;">' +
    '<a href="*|UNSUB|*" style="color:#999;">Unsubscribe</a> | ' +
    '<a href="*|UPDATE_PROFILE|*" style="color:#999;">Update preferences</a>' +
    '</div>';
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) return html.slice(0, idx) + unsubBlock + html.slice(idx);
  return html + unsubBlock;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
