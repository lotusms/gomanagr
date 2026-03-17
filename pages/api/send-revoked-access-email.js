/**
 * Send email notifying a team member that their access has been revoked.
 * Uses the tenant's Resend/Mailchimp connection (Settings > Integrations). No fallback to .env SMTP/Resend.
 * POST body: { organizationId, to, memberName?, orgName? }
 */

import { sendTenantEmail } from '@/lib/sendTenantEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organizationId, to, memberName, orgName } = req.body;

  if (!to || !to.trim()) {
    return res.status(400).json({ error: 'Missing recipient email' });
  }
  if (!organizationId || !String(organizationId).trim()) {
    return res.status(400).json({ error: 'Missing organizationId' });
  }

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'GoManagr';
  const html = `
    <p>${memberName ? `Hi ${memberName},` : 'Hi,'}</p>
    <p>Your access to ${appName}${orgName ? ` for ${orgName}` : ''} has been revoked.</p>
    <p>You will no longer be able to sign in to the organization. Any existing invite links will no longer work.</p>
    <p>If you believe this was done in error, please contact your organization administrator.</p>
  `;

  const result = await sendTenantEmail(organizationId, {
    to: String(to).trim(),
    subject: `Your access to ${appName} has been revoked`,
    html,
  });

  if (!result.sent) {
    return res.status(503).json({
      error: result.error || 'Failed to send email',
      message: result.error || 'Configure Resend or Mailchimp in Settings > Integrations.',
      sent: false,
    });
  }
  return res.status(200).json({ sent: true });
}
