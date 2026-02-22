/**
 * Accept website consultation request and optionally email it to LOTUS Marketing Solutions.
 * Body: { name, email, company, message }
 * Set WEBSITE_CONSULTATION_TO to the email that should receive requests (e.g. info@lotusmarketingsolutions.com).
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, message } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const to = process.env.WEBSITE_CONSULTATION_TO || process.env.SMTP_FROM_EMAIL || 'info@lotusmarketingsolutions.com';
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
  const fromName = process.env.SMTP_FROM_NAME || appName;
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'info@lotusmarketingsolutions.com';

  const html = `
    <p><strong>Website + GoManagr integration consultation request</strong></p>
    <p><strong>Name:</strong> ${String(name).trim()}</p>
    <p><strong>Email:</strong> ${String(email).trim()}</p>
    <p><strong>Company:</strong> ${company ? String(company).trim() : '—'}</p>
    ${message ? `<p><strong>Message:</strong></p><p>${String(message).trim()}</p>` : ''}
    <p><em>Sent from ${appName}</em></p>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true';
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: { user: smtpUser, pass: smtpPass },
      });
      const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
      await transporter.sendMail({
        from,
        to,
        replyTo: String(email).trim(),
        subject: `[${appName}] Website consultation request from ${String(name).trim()}`,
        html,
      });
      return res.status(200).json({ ok: true, message: 'Request sent' });
    } catch (err) {
      console.error('[website-consultation] SMTP error:', err);
      return res.status(500).json({
        error: 'Failed to send request',
        message: err.message || 'Email error',
      });
    }
  }

  // No SMTP: still accept the request (e.g. log or store later) and return success
  console.log('[website-consultation] No SMTP configured. Request:', { name, email, company, message: message || '' });
  return res.status(200).json({ ok: true, message: 'Request received' });
}
