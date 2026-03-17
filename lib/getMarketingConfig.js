/**
 * Server-side: read/write marketing provider config (Mailchimp, Twilio, Resend) from Supabase app_settings.
 * Single global config. Never expose raw apiSecret to client.
 */

import { createClient } from '@supabase/supabase-js';

const PROVIDER_TYPES = { MAILCHIMP: 'mailchimp', TWILIO: 'twilio', SES: 'ses', RESEND: 'resend', SMTP: 'smtp' };
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
  {
    providerType: PROVIDER_TYPES.SMTP,
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    apiSecret: '',
    senderEmail: '',
    senderName: '',
    notes: 'Email only. Use your own SMTP server for invoices, receipts, and other transactional email.',
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
 * Build marketing providers array from org integrations (mailchimp, twilio, resend).
 * Maps encrypted org integration configs to the same shape as app_settings marketing_providers.
 */
async function getMarketingConfigFromOrg(organizationId) {
  const { getOrgIntegration } = await import('@/lib/integrations/get-org-integration');
  const base = {
    defaultEmailProvider: undefined,
    defaultSmsProvider: undefined,
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
  };
  const providers = [...base.providers];
  const orgId = String(organizationId).trim();

  const [mailchimp, twilio, resend, smtp] = await Promise.all([
    getOrgIntegration(orgId, 'mailchimp'),
    getOrgIntegration(orgId, 'twilio'),
    getOrgIntegration(orgId, 'resend'),
    getOrgIntegration(orgId, 'smtp'),
  ]);

  if (mailchimp?.config) {
    const idx = providers.findIndex((p) => p.providerType === PROVIDER_TYPES.MAILCHIMP);
    if (idx >= 0) {
      const c = mailchimp.config;
      providers[idx] = {
        ...providers[idx],
        enabled: true,
        apiKey: c.apiKey ?? '',
        apiSecret: c.apiSecret ?? '',
        senderEmail: c.senderEmail ?? '',
        senderName: c.senderName ?? '',
        fromNumber: c.fromNumber ?? '',
        smsEnabled: !!c.smsEnabled,
      };
    }
  }
  if (smtp?.config) {
    const idx = providers.findIndex((p) => p.providerType === PROVIDER_TYPES.SMTP);
    if (idx >= 0) {
      const c = smtp.config;
      const port = c.port != null ? parseInt(String(c.port), 10) : 587;
      providers[idx] = {
        ...providers[idx],
        enabled: true,
        host: (c.host && String(c.host).trim()) || '',
        port: Number.isNaN(port) ? 587 : port,
        secure: c.secure === true || c.secure === 'true',
        user: (c.user && String(c.user).trim()) || '',
        apiSecret: c.password != null ? String(c.password) : '',
        senderEmail: (c.fromEmail && String(c.fromEmail).trim()) || '',
        senderName: (c.fromName && String(c.fromName).trim()) || '',
      };
    }
  }
  if (twilio?.config) {
    const idx = providers.findIndex((p) => p.providerType === PROVIDER_TYPES.TWILIO);
    if (idx >= 0) {
      const c = twilio.config;
      providers[idx] = {
        ...providers[idx],
        enabled: true,
        apiKey: c.accountSid ?? '',
        apiSecret: c.authToken ?? '',
        fromNumber: c.fromNumber ?? '',
      };
    }
  }
  if (resend?.config) {
    const idx = providers.findIndex((p) => p.providerType === PROVIDER_TYPES.RESEND);
    if (idx >= 0) {
      const c = resend.config;
      providers[idx] = {
        ...providers[idx],
        enabled: true,
        apiKey: c.apiKey ?? '',
        senderEmail: c.senderEmail ?? '',
        senderName: c.senderName ?? '',
      };
    }
  }

  return { ...base, providers };
}

/**
 * Get global marketing config from app_settings. Used when no org or as fallback.
 */
async function getGlobalMarketingConfig() {
  const fallback = {
    defaultEmailProvider: undefined,
    defaultSmsProvider: undefined,
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
  };
  const supabase = getSupabaseAdmin();
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
 * Server-only: get full marketing config. When organizationId is set: merge org integrations with global (org overrides per-provider when org has credentials); so existing global config still works when org has not set their own.
 * @param {string|null|undefined} [organizationId]
 * @returns {Promise<{ defaultEmailProvider?: string, defaultSmsProvider?: string, providers: Array }>}
 */
export async function getMarketingConfig(organizationId) {
  const globalConfig = await getGlobalMarketingConfig();
  if (!organizationId || !String(organizationId).trim()) {
    return globalConfig;
  }

  const orgConfig = await getMarketingConfigFromOrg(organizationId);
  const mergedProviders = globalConfig.providers.map((globalProvider) => {
    const orgProvider = orgConfig.providers.find((p) => p.providerType === globalProvider.providerType);
    const hasOrgCredentials = orgProvider && (orgProvider.apiKey?.trim() || orgProvider.apiSecret?.trim());
    return hasOrgCredentials ? { ...globalProvider, ...orgProvider } : globalProvider;
  });
  return {
    defaultEmailProvider: orgConfig.defaultEmailProvider ?? globalConfig.defaultEmailProvider,
    defaultSmsProvider: orgConfig.defaultSmsProvider ?? globalConfig.defaultSmsProvider,
    providers: mergeProviders(mergedProviders),
  };
}

/**
 * For Settings API GET: return config with apiKey/apiSecret masked. Supports organizationId for per-org.
 * @param {string|null|undefined} [organizationId]
 */
export async function getMarketingConfigForSettings(organizationId) {
  const config = await getMarketingConfig(organizationId);
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
