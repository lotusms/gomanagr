/**
 * Send invite email to a team member with signup link.
 *
 * Who sends the email: GoManagr (the app) sends it from your configured address
 * (e.g. info@lotusmarketingsolutions.com). The organization admin is the one who
 * triggered the invite; their name appears in the body and Reply-To is set to
 * their email so replies go to them.
 *
 * Sending options (first available wins):
 * 1. SMTP (Nodemailer) — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL
 * 2. Resend — set RESEND_API_KEY (optional)
 * 3. Otherwise returns inviteLink for manual sharing (copy/paste).
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, inviteLink, memberName, inviterName, inviterEmail } = req.body;

  if (!to || !inviteLink) {
    return res.status(400).json({ error: 'Missing to or inviteLink' });
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
  const fromName = process.env.SMTP_FROM_NAME || appName;

  const html = `
    <p>${memberName ? `Hi ${memberName}, ` : ''}You have been invited to join ${appName} as a team member.${inviterName ? ` ${inviterName} sent you this invitation.` : ''}</p>
    <p>Set your password and sign in here:</p>
    <p><a href="${inviteLink}">${inviteLink}</a></p>
    <p>This link will expire in 7 days. If you didn't expect this invite, you can ignore this email.</p>
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
      const mailOptions = {
        from,
        to,
        replyTo: inviterEmail && inviterEmail.trim() ? inviterEmail.trim() : undefined,
        subject: `You're invited to ${appName}`,
        html,
      };
      await transporter.sendMail(mailOptions);
      return res.status(200).json({ sent: true, message: 'Invite email sent' });
    } catch (err) {
      console.error('[send-invite-email] SMTP error:', err);
      return res.status(500).json({
        error: 'Failed to send email',
        details: err.message || 'SMTP error',
      });
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
        to: [to],
        replyTo: inviterEmail && inviterEmail.trim() ? inviterEmail.trim() : undefined,
        subject: `You're invited to ${appName}`,
        html,
      });
      if (error) {
        console.error('[send-invite-email] Resend error:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
      }
      return res.status(200).json({ sent: true, message: 'Invite email sent' });
    } catch (err) {
      console.error('[send-invite-email] Resend exception:', err);
    }
  }

  return res.status(200).json({
    sent: false,
    inviteLink,
    message: 'No email provider configured. Share the invite link manually.',
  });
}
