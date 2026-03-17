/**
 * SMTP integration: validate by connecting and calling verify().
 * Used for tenant-configured email sending (invoices, receipts, etc.).
 */

/**
 * Validate SMTP config. Requires host, port, user, password, and sender email.
 * @param {{ host?: string, port?: number|string, secure?: boolean, user?: string, password?: string, fromEmail?: string, fromName?: string }} config
 * @returns {Promise<{ ok: boolean, error?: string, status: 'connected'|'invalid' }>}
 */
export async function validateSmtpConfig(config) {
  const host = config?.host && String(config.host).trim();
  const user = config?.user && String(config.user).trim();
  const password = config?.password != null ? String(config.password) : '';
  const fromEmail = config?.fromEmail && String(config.fromEmail).trim();

  if (!host) {
    return { ok: false, error: 'SMTP host is required', status: 'invalid' };
  }
  if (!user) {
    return { ok: false, error: 'SMTP user is required', status: 'invalid' };
  }
  if (!password) {
    return { ok: false, error: 'SMTP password is required', status: 'invalid' };
  }
  if (!fromEmail) {
    return { ok: false, error: 'From email is required', status: 'invalid' };
  }

  const port = config?.port != null ? parseInt(String(config.port), 10) : 587;
  const secure = config?.secure === true || config?.secure === 'true';

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host,
      port: Number.isNaN(port) ? 587 : port,
      secure,
      auth: { user, pass: password },
    });
    await transporter.verify();
    return { ok: true, status: 'connected' };
  } catch (e) {
    return { ok: false, error: e?.message || 'SMTP connection failed', status: 'invalid' };
  }
}

export function smtpMetadataFromConfig(config) {
  return {
    host: config?.host ? String(config.host).trim() : null,
    fromEmail: config?.fromEmail ? String(config.fromEmail).trim() : null,
    fromName: config?.fromName ? String(config.fromName).trim() : null,
  };
}
