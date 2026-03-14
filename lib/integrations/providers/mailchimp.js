/**
 * Mailchimp integration: validate API key (optional: ping or list). Mock if no SDK.
 */

/**
 * Validate Mailchimp config. API key + server prefix required.
 * @param {{ apiKey?: string, serverPrefix?: string }} config
 * @returns {Promise<{ ok: boolean, error?: string, status: 'connected'|'invalid' }>}
 */
export async function validateMailchimpConfig(config) {
  const apiKey = config?.apiKey && String(config.apiKey).trim();
  const serverPrefix = config?.serverPrefix && String(config.serverPrefix).trim();
  if (!apiKey) {
    return { ok: false, error: 'API key is required', status: 'invalid' };
  }
  if (!serverPrefix) {
    return { ok: false, error: 'Server prefix (e.g. us21) is required', status: 'invalid' };
  }
  try {
    const dc = serverPrefix.toLowerCase();
    const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) return { ok: true, status: 'connected' };
    const text = await res.text();
    return { ok: false, error: text || `HTTP ${res.status}`, status: 'invalid' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Mailchimp validation failed', status: 'invalid' };
  }
}

export function mailchimpMetadataFromConfig(config) {
  return {
    senderEmail: config?.senderEmail ? String(config.senderEmail).trim() : null,
    senderName: config?.senderName ? String(config.senderName).trim() : null,
    serverPrefix: config?.serverPrefix ? String(config.serverPrefix).trim() : null,
  };
}
