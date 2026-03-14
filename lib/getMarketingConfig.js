/**
 * Server-side: read/write marketing provider config (Mailchimp, Twilio, Resend) from Supabase app_settings.
 * Used by API routes and (future) server-side send. Never expose raw apiSecret to client.
 */

import { createClient } from '@supabase/supabase-js';

const PROVIDER_TYPES = { MAILCHIMP: 'mailchimp', TWILIO: 'twilio', SES: 'ses', RESEND: 'resend' };
const MARKETING_KEY = 'marketing_providers';
const MASK = '••••••••••••';

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

let supabaseAdmin;
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

function maskSecret(value) {
  if (!value || typeof value !== 'string') return null;
  const t = value.trim();
  if (!t.length) return null;
  if (t.length <= 6) return MASK;
  return t.slice(0, 4) + MASK;
}

/**
 * Merge saved providers with defaults so new fields are always present.
 * @param {Array} saved
 * @returns {Array}
 */
function mergeProviders(saved) {
  const list = Array.isArray(saved) ? saved : [];
  return DEFAULT_PROVIDERS.map((d) => {
    const s = list.find((p) => p.providerType === d.providerType);
    return s ? { ...d, ...s } : { ...d };
  });
}

/**
 * Server-only: get full marketing config from DB (for send/validate). No masking.
 * @returns {Promise<{ defaultEmailProvider?: string, defaultSmsProvider?: string, providers: Array }>}
 */
export async function getMarketingConfig() {
  const supabase = getSupabaseAdmin();
  const fallback = {
    defaultEmailProvider: undefined,
    defaultSmsProvider: undefined,
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
  };
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', MARKETING_KEY)
      .maybeSingle();
    if (error || !data?.value || typeof data.value !== 'object') return fallback;
    const v = data.value;
    const providers = mergeProviders(v.providers);
    return {
      defaultEmailProvider: v.defaultEmailProvider || undefined,
      defaultSmsProvider: v.defaultSmsProvider || undefined,
      providers,
    };
  } catch (_) {
    return fallback;
  }
}

/**
 * For Settings API GET: return config with apiKey/apiSecret masked so client can show "configured" and "leave blank to keep".
 * @returns {Promise<{ defaultEmailProvider?: string, defaultSmsProvider?: string, providers: Array }>}
 */
export async function getMarketingConfigForSettings() {
  const config = await getMarketingConfig();
  const providers = config.providers.map((p) => ({
    ...p,
    apiKey: p.apiKey && p.apiKey.trim() ? maskSecret(p.apiKey) : '',
    apiSecret: p.apiSecret && p.apiSecret.trim() ? maskSecret(p.apiSecret) : '',
  }));
  return { ...config, providers };
}

/**
 * Check if a value is a masked placeholder (do not overwrite DB with it).
 * @param {string} value
 * @returns {boolean}
 */
export function isMaskedValue(value) {
  if (value == null || typeof value !== 'string') return false;
  return /^.{0,6}•+$/.test(value.trim()) || value.trim() === '';
}

/**
 * Save marketing config to DB. Only call from authenticated API with owner/developer check.
 * Incoming providers: if apiKey/apiSecret look masked or empty, keep existing from current.
 * @param {Object} incoming - { defaultEmailProvider?, defaultSmsProvider?, providers? }
 * @param {Object} current - full current config from getMarketingConfig()
 * @returns {Promise<{ error?: string }>}
 */
export async function saveMarketingConfig(incoming, current) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Service unavailable' };

  const nextProviders = (incoming.providers && Array.isArray(incoming.providers))
    ? current.providers.map((existing) => {
        const inc = incoming.providers.find((p) => p.providerType === existing.providerType);
        if (!inc) return existing;
        const merged = { ...existing, ...inc };
        if (isMaskedValue(inc.apiKey)) merged.apiKey = existing.apiKey ?? '';
        else if (inc.apiKey !== undefined) merged.apiKey = String(inc.apiKey).trim();
        if (isMaskedValue(inc.apiSecret)) merged.apiSecret = existing.apiSecret ?? '';
        else if (inc.apiSecret !== undefined) merged.apiSecret = String(inc.apiSecret).trim();
        return merged;
      })
    : current.providers;

  const next = {
    defaultEmailProvider: incoming.defaultEmailProvider !== undefined ? (incoming.defaultEmailProvider || undefined) : current.defaultEmailProvider,
    defaultSmsProvider: incoming.defaultSmsProvider !== undefined ? (incoming.defaultSmsProvider || undefined) : current.defaultSmsProvider,
    providers: nextProviders,
  };

  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: MARKETING_KEY, value: next, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e?.message || 'Failed to save' };
  }
}
