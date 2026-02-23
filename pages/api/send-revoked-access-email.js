/**
 * Send email notifying a team member that their access to GoManagr has been revoked.
 * Uses same SMTP/Resend config as send-invite-email.
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, memberName, orgName } = req.body;

  if (!to || !to.trim()) {
    return res.status(400).json({ error: 'Missing recipient email' });
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
  const fromName = process.env.SMTP_FROM_NAME || appName;

  const html = `
    <p>${memberName ? `Hi ${memberName},` : 'Hi,'}</p>
    <p>Your access to ${appName}${orgName ? ` for ${orgName}` : ''} has been revoked.</p>
    <p>You will no longer be able to sign in to the organization. Any existing invite links will no longer work.</p>
    <p>If you believe this was done in error, please contact your organization administrator.</p>
  `;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'info@lotusmarketingsolutions.com';

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
        to: to.trim(),
        subject: `Your access to ${appName} has been revoked`,
        html,
      });
      return res.status(200).json({ sent: true });
    } catch (err) {
      console.error('[send-revoked-access-email] SMTP error:', err);
      return res.status(500).json({ error: 'Failed to send email', details: err.message });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const { error } = await resend.emails.send({
        from,
        to: [to.trim()],
        subject: `Your access to ${appName} has been revoked`,
        html,
      });
      if (error) {
        console.error('[send-revoked-access-email] Resend error:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
      }
      return res.status(200).json({ sent: true });
    } catch (err) {
      console.error('[send-revoked-access-email] Resend exception:', err);
    }
  }

  return res.status(200).json({ sent: false, message: 'No email provider configured' });
}
