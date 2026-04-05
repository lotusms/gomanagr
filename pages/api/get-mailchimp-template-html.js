/**
 * Load HTML for one Mailchimp template (for compose / editing).
 * POST { organizationId, templateId }
 * Returns { html: string, available: boolean, serverPrefix?: string }
 */
import { getMailchimpCredentials, fetchTemplateHtml } from '@/lib/marketing/mailchimpApiService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organizationId, templateId } = req.body || {};
  if (!organizationId || templateId == null || templateId === '') {
    return res.status(400).json({
      error: 'Missing organizationId or templateId',
      html: '',
      available: false,
    });
  }

  try {
    const creds = await getMailchimpCredentials(organizationId);
    if (!creds) {
      return res.status(200).json({
        html: '',
        available: false,
        warning: 'Mailchimp is not connected for this organization.',
      });
    }

    const { html, available } = await fetchTemplateHtml(creds.apiKey, creds.serverPrefix, templateId);
    return res.status(200).json({
      html,
      available,
      serverPrefix: creds.serverPrefix,
    });
  } catch (err) {
    console.error('[get-mailchimp-template-html]', err);
    return res.status(200).json({
      html: '',
      available: false,
      error: err.message || 'Failed to load template HTML',
    });
  }
}
