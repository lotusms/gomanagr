/**
 * Marketing campaign service (mock). CRUD and send via provider registry.
 */

import { getActiveProviderForChannel } from './providerRegistry.js';
import { sendCampaign as registrySend } from './providerRegistry.js';
import { CAMPAIGN_STATUSES } from './types.js';

const STORAGE_KEY = 'gomanagr_marketing_campaigns';

/**
 * @returns {Promise<import('./types').Campaign[]>}
 */
export async function getCampaigns() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
      }
    }
  } catch (_) {}
  return [];
}

/**
 * @param {import('./types').Campaign} campaign
 * @returns {Promise<import('./types').Campaign>}
 */
export async function saveDraft(campaign) {
  const list = await getCampaigns();
  const existing = list.find((c) => c.id === campaign.id);
  const toSave = {
    ...campaign,
    status: CAMPAIGN_STATUSES.DRAFT,
    createdAt: campaign.createdAt || new Date().toISOString(),
  };
  if (existing) {
    const idx = list.findIndex((c) => c.id === campaign.id);
    list[idx] = toSave;
  } else {
    toSave.id = toSave.id || `draft_${Date.now()}`;
    list.unshift(toSave);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
  return toSave;
}

/**
 * @param {string} channel
 * @returns {Promise<import('./types').Campaign[]>}
 */
export async function getCampaignsByChannel(channel) {
  const list = await getCampaigns();
  return list.filter((c) => c.channel === channel).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * Send campaign: validate provider then call registry send; update campaign status.
 * @param {import('./types').Campaign} campaign
 * @param {import('./types').CampaignRecipient[]} recipients
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendCampaign(campaign, recipients) {
  const active = await getActiveProviderForChannel(campaign.channel);
  if (!active) {
    return {
      success: false,
      error: campaign.channel === 'email'
        ? 'No email provider configured or enabled.'
        : 'No SMS provider configured or enabled.',
    };
  }
  const payload = {
    subject: campaign.subject,
    body: campaign.body,
    recipients,
  };
  const result = await registrySend(campaign.channel, payload);
  const list = await getCampaigns();
  const idx = list.findIndex((c) => c.id === campaign.id);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      status: result.success ? CAMPAIGN_STATUSES.SENT : CAMPAIGN_STATUSES.FAILED,
      sentAt: result.success ? new Date().toISOString() : undefined,
      errorMessage: result.error,
    };
  } else {
    list.unshift({
      ...campaign,
      id: campaign.id || `sent_${Date.now()}`,
      status: result.success ? CAMPAIGN_STATUSES.SENT : CAMPAIGN_STATUSES.FAILED,
      sentAt: result.success ? new Date().toISOString() : undefined,
      errorMessage: result.error,
      createdAt: campaign.createdAt || new Date().toISOString(),
    });
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
  return result;
}
