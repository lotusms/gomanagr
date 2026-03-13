/**
 * Marketing settings service. Persists provider config and defaults (mock: in-memory + localStorage key).
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

/**
 * @returns {Promise<import('./types').MarketingSettings>}
 */
export async function getMarketingSettings() {
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

/**
 * @param {import('./types').MarketingSettings} settings
 * @returns {Promise<void>}
 */
export async function saveMarketingSettings(settings) {
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
