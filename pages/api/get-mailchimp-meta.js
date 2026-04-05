/**
 * Lightweight Mailchimp connection check for UI links (server prefix).
 * POST { organizationId }
 */
import { getMailchimpCredentials } from '@/lib/marketing/mailchimpApiService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organizationId } = req.body || {};
  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId', connected: false });
  }

  try {
    const creds = await getMailchimpCredentials(organizationId);
    if (!creds) {
      return res.status(200).json({ connected: false });
    }
    return res.status(200).json({
      connected: true,
      serverPrefix: creds.serverPrefix || 'us21',
    });
  } catch (err) {
    console.error('[get-mailchimp-meta]', err);
    return res.status(200).json({ connected: false, error: err.message });
  }
}
