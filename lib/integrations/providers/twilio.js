/**
 * Twilio integration: validate credentials. Actual SMS send stays in existing marketing layer.
 */

/**
 * Validate Twilio credentials (optional: fetch account). Mock if twilio not installed.
 * @param {{ accountSid?: string, authToken?: string, fromNumber?: string }} config
 * @returns {Promise<{ ok: boolean, error?: string, status: 'connected'|'invalid' }>}
 */
export async function validateTwilioConfig(config) {
  const accountSid = config?.accountSid && String(config.accountSid).trim();
  const authToken = config?.authToken && String(config.authToken).trim();
  const fromNumber = config?.fromNumber && String(config.fromNumber).trim();
  if (!accountSid || !accountSid.startsWith('AC')) {
    return { ok: false, error: 'Valid Account SID (AC...) is required', status: 'invalid' };
  }
  if (!authToken) {
    return { ok: false, error: 'Auth Token is required', status: 'invalid' };
  }
  if (!fromNumber) {
    return { ok: false, error: 'From phone number is required', status: 'invalid' };
  }
  try {
    const twilio = await import('twilio').catch(() => null);
    if (twilio) {
      const client = twilio.default(accountSid, authToken);
      await client.api.accounts(accountSid).fetch();
      return { ok: true, status: 'connected' };
    }
    return { ok: true, status: 'connected' };
  } catch (e) {
    return { ok: false, error: e?.message || 'Twilio validation failed', status: 'invalid' };
  }
}

export function twilioMetadataFromConfig(config) {
  return {
    fromNumber: config?.fromNumber ? String(config.fromNumber).trim() : null,
    accountSidSuffix: config?.accountSid ? String(config.accountSid).slice(-4) : null,
  };
}
