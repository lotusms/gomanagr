/**
 * Resend integration: validate API key (optional: domains list). Uses Resend SDK if available.
 */

/**
 * Validate Resend config.
 * @param {{ apiKey?: string, senderEmail?: string }} config
 * @returns {Promise<{ ok: boolean, error?: string, status: 'connected'|'invalid' }>}
 */
export async function validateResendConfig(config) {
  const apiKey = config?.apiKey && String(config.apiKey).trim();
  if (!apiKey) {
    return { ok: false, error: 'API key is required', status: 'invalid' };
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { data, error } = await resend.domains.list();
    if (error && error.message && !error.message.includes('Unauthorized')) {
      return { ok: false, error: error.message, status: 'invalid' };
    }
    return { ok: true, status: 'connected' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Resend validation failed', status: 'invalid' };
  }
}

export function resendMetadataFromConfig(config) {
  return {
    senderEmail: config?.senderEmail ? String(config.senderEmail).trim() : null,
    senderName: config?.senderName ? String(config.senderName).trim() : null,
  };
}
