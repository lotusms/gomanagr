/**
 * Send a single email using the tenant's (organization's) connected email provider
 * (Resend or SMTP from Settings > Integrations).
 * Use this for all tenant-facing emails: invoices, receipts, proposals, team invites, revoked access.
 * Do NOT use .env SMTP/RESEND for these — those are for GoManagr → tenant communication only.
 *
 * Server-only. Uses getMarketingConfig(organizationId) for org integrations.
 *
 * @param {string|null|undefined} organizationId - Organization ID (tenant). If null/empty, returns sent: false.
 * @param {{ to: string, subject: string, html: string, replyTo?: string, fromName?: string }} options
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export async function sendTenantEmail(organizationId, options) {
  const { to, subject, html, replyTo, fromName } = options || {};
  if (!to || !String(to).trim()) {
    return { sent: false, error: 'Missing recipient' };
  }
  const toEmail = String(to).trim();
  const orgId = organizationId && String(organizationId).trim();
  if (!orgId) {
    return { sent: false, error: 'Missing organization context' };
  }

  let config;
  try {
    const { getMarketingConfig } = await import('@/lib/getMarketingConfig');
    config = await getMarketingConfig(orgId);
  } catch (e) {
    console.error('[sendTenantEmail] getMarketingConfig failed', e?.message);
    return { sent: false, error: e?.message || 'Failed to load tenant email config' };
  }

  const providers = config?.providers || [];
  const defaultEmail = config?.defaultEmailProvider;
  const emailProviders = providers.filter((p) => {
    if (!p?.enabled) return false;
    if (p.providerType === 'resend') return !!p.apiKey?.trim();
    if (p.providerType === 'smtp') return !!(p.host?.trim() && p.user?.trim() && p.apiSecret);
    return false;
  });
  const preferred = defaultEmail && emailProviders.find((p) => p.providerType === defaultEmail);
  const provider = preferred || emailProviders.find((p) => p.providerType === 'resend') || emailProviders.find((p) => p.providerType === 'smtp');
  if (!provider) {
    return { sent: false, error: 'No email provider configured. Configure Resend or SMTP in Settings > Integrations.' };
  }

  const fromAddr = provider.senderEmail?.trim() || null;
  const fromDisplay = fromName || provider.senderName?.trim() || null;
  const from = fromAddr ? (fromDisplay ? `"${fromDisplay.replace(/"/g, '\\"')}" <${fromAddr}>` : fromAddr) : null;
  if (!from) {
    return { sent: false, error: 'Sender email not configured for this provider' };
  }

  if (provider.providerType === 'resend') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(provider.apiKey.trim());
      const payload = { from, to: [toEmail], subject, html };
      if (replyTo && String(replyTo).trim()) payload.reply_to = String(replyTo).trim();
      const { error } = await resend.emails.send(payload);
      if (error) {
        console.error('[sendTenantEmail] Resend error:', error);
        return { sent: false, error: error?.message || 'Resend send failed' };
      }
      return { sent: true };
    } catch (e) {
      console.error('[sendTenantEmail] Resend exception:', e?.message);
      return { sent: false, error: e?.message || 'Resend send failed' };
    }
  }

  if (provider.providerType === 'smtp') {
    try {
      const nodemailer = await import('nodemailer');
      const port = provider.port != null ? parseInt(String(provider.port), 10) : 587;
      const secure = provider.secure === true || provider.secure === 'true';
      const transporter = nodemailer.default.createTransport({
        host: provider.host.trim(),
        port: Number.isNaN(port) ? 587 : port,
        secure,
        auth: { user: provider.user.trim(), pass: provider.apiSecret },
      });
      const mailOptions = { from, to: toEmail, subject, html };
      if (replyTo && String(replyTo).trim()) mailOptions.replyTo = String(replyTo).trim();
      await transporter.sendMail(mailOptions);
      return { sent: true };
    } catch (e) {
      console.error('[sendTenantEmail] SMTP exception:', e?.message);
      return { sent: false, error: e?.message || 'SMTP send failed' };
    }
  }

  return { sent: false, error: 'Unsupported provider' };
}
