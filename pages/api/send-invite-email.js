/**
 * Send invite email to a team member with signup link.
 * Uses the tenant's Resend/Mailchimp connection (Settings > Integrations). No fallback to .env SMTP/Resend.
 * POST body: { organizationId, to, inviteLink, memberName?, inviterName?, inviterEmail? }
 * Reply-To is set to inviterEmail when provided.
 */

import { sendTenantEmail } from '@/lib/sendTenantEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organizationId, to, inviteLink, memberName, inviterName, inviterEmail } = req.body;

  if (!to || !inviteLink) {
    return res.status(400).json({ error: 'Missing to or inviteLink' });
  }
  if (!organizationId || !String(organizationId).trim()) {
    return res.status(400).json({ error: 'Missing organizationId' });
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
  const html = `
    <p>${memberName ? `Hi ${memberName}, ` : ''}You have been invited to join ${appName} as a team member.${inviterName ? ` ${inviterName} sent you this invitation.` : ''}</p>
    <p>Set your password and sign in here:</p>
    <p><a href="${inviteLink}">${inviteLink}</a></p>
    <p>This link will expire in 7 days. If you didn't expect this invite, you can ignore this email.</p>
  `;

  const result = await sendTenantEmail(organizationId, {
    to: String(to).trim(),
    subject: `You're invited to ${appName}`,
    html,
    replyTo: inviterEmail && String(inviterEmail).trim() ? String(inviterEmail).trim() : undefined,
  });

  if (!result.sent) {
    return res.status(503).json({
      error: result.error || 'Failed to send email',
      message: result.error || 'Configure Resend or Mailchimp in Settings > Integrations to send invite emails.',
      inviteLink,
    });
  }
  return res.status(200).json({ sent: true, message: 'Invite email sent' });
}
