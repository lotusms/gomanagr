/**
 * Marketing settings service. Persists provider config and defaults.
 * When userId is provided, loads/saves from Supabase via API (Settings > API).
 * Otherwise uses localStorage (e.g. campaign pages without userId, or fallback).
 */

import { PROVIDER_TYPES } from './types.js';

const STORAGE_KEY = 'gomanagr_marketing_settings';

const DEFAULT_PROVIDERS = [
  {
    providerType: PROVIDER_TYPES.MAILCHIMP,
    enabled: false,
    apiKey: '',
    apiSecret: '',
    senderEmail: '',
    senderName: '',
    fromNumber: '',
    smsEnabled: false,
    notes: 'Mailchimp supports both email and SMS. SMS availability depends on account eligibility, approval, and market support.',
  },
  {
    providerType: PROVIDER_TYPES.TWILIO,
    enabled: false,
    apiKey: '',
    apiSecret: '',
    fromNumber: '',
    notes: 'SMS only. Configure Account SID (API key), Auth Token (secret), and a Twilio phone number.',
  },
  {
    providerType: PROVIDER_TYPES.RESEND,
    enabled: false,
    apiKey: '',
    senderEmail: '',
    senderName: '',
    notes: 'Email only. Verify your sender domain in Resend before sending.',
  },
];

function getFromStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const providers = Array.isArray(parsed.providers) ? parsed.providers : [];
        const merged = DEFAULT_PROVIDERS.map((d) => {
          const saved = providers.find((p) => p.providerType === d.providerType);
          return saved ? { ...d, ...saved } : d;
        });
        return {
          defaultEmailProvider: parsed.defaultEmailProvider || undefined,
          defaultSmsProvider: parsed.defaultSmsProvider || undefined,
          providers: merged,
        };
      }
    }
  } catch (_) {}
  return {
    defaultEmailProvider: undefined,
    defaultSmsProvider: undefined,
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
  };
}

function saveToStorage(settings) {
  const toStore = {
    defaultEmailProvider: settings.defaultEmailProvider,
    defaultSmsProvider: settings.defaultSmsProvider,
    providers: settings.providers,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  } catch (_) {}
}

/**
 * @param {string} [userId] - When provided, fetch from API (Supabase). Otherwise use localStorage.
 * @returns {Promise<import('./types').MarketingSettings>}
 */
export async function getMarketingSettings(userId) {
  if (userId && typeof userId === 'string' && userId.trim()) {
    try {
      const params = new URLSearchParams({ userId: userId.trim() });
      const res = await fetch(`/api/settings/marketing-providers?${params}`);
      if (res.ok) {
        const data = await res.json();
        const providers = Array.isArray(data.providers) ? data.providers : [];
        const merged = DEFAULT_PROVIDERS.map((d) => {
          const saved = providers.find((p) => p.providerType === d.providerType);
          return saved ? { ...d, ...saved } : d;
        });
        const settings = {
          defaultEmailProvider: data.defaultEmailProvider || undefined,
          defaultSmsProvider: data.defaultSmsProvider || undefined,
          providers: merged,
        };
        saveToStorage(settings);
        return settings;
      }
    } catch (_) {}
  }
  return getFromStorage();
}

/**
 * @param {import('./types').MarketingSettings} settings
 * @param {string} [userId] - When provided, save to API (Supabase) then cache to localStorage.
 * @returns {Promise<void>}
 */
export async function saveMarketingSettings(settings, userId) {
  const toStore = {
    defaultEmailProvider: settings.defaultEmailProvider,
    defaultSmsProvider: settings.defaultSmsProvider,
    providers: settings.providers,
  };
  if (userId && typeof userId === 'string' && userId.trim()) {
    try {
      const res = await fetch('/api/settings/marketing-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          ...toStore,
        }),
      });
      if (res.ok) {
        saveToStorage(toStore);
        return;
      }
    } catch (_) {}
  }
  saveToStorage(toStore);
}
