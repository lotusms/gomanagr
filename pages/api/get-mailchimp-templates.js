/**
 * Fetch Mailchimp templates for the connected org account.
 * POST { userId, organizationId }
 * Returns { templates: [{ id, name, type, thumbnail, date_created, active }] }
 */
import { getMailchimpCredentials, listTemplates } from '@/lib/marketing/mailchimpApiService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organizationId } = req.body || {};
  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId', templates: [] });
  }

  try {
    const creds = await getMailchimpCredentials(organizationId);
    if (!creds) {
      return res.status(200).json({
        templates: [],
        warning: 'Mailchimp is not connected for this organization.',
      });
    }

    const templates = await listTemplates(creds.apiKey, creds.serverPrefix);
    return res.status(200).json({ templates, serverPrefix: creds.serverPrefix });
  } catch (err) {
    console.error('[get-mailchimp-templates]', err);
    return res.status(200).json({
      templates: [],
      error: err.message || 'Failed to fetch Mailchimp templates',
    });
  }
}
