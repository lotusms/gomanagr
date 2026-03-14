/**
 * Organization integrations API. RBAC: only superadmin or developer for the org.
 * GET: list integrations for org (metadata + status only, no secrets).
 * POST: save or test a provider. Body: { userId, organizationId, provider, action: 'save'|'test', config?, metadata? }.
 * SECURITY: Never log config or any secret. Never return raw secrets to client.
 */

import { createClient } from '@supabase/supabase-js';
import { listOrgIntegrations, getOrgIntegrationSummary, getOrgIntegration, saveOrgIntegration } from '@/lib/integrations/get-org-integration';
import { validateStripeConfig, stripeMetadataFromConfig } from '@/lib/integrations/providers/stripe';
import { validateTwilioConfig, twilioMetadataFromConfig } from '@/lib/integrations/providers/twilio';
import { validateMailchimpConfig, mailchimpMetadataFromConfig } from '@/lib/integrations/providers/mailchimp';
import { validateResendConfig, resendMetadataFromConfig } from '@/lib/integrations/providers/resend';
import { listProviders } from '@/lib/integrations/registry';

let supabaseAdmin;
function getAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    supabaseAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

async function requireOwnerOrDeveloper(userId, organizationId) {
  const supabase = getAdmin();
  if (!supabase) return { error: 'Service unavailable', status: 503 };
  let query = supabase.from('org_members').select('role').eq('user_id', userId);
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data: rows, error } = await query;
  if (error) return { error: error.message, status: 500 };
  const allowed = (rows || []).some((r) => r.role === 'superadmin' || r.role === 'developer');
  if (!allowed) return { error: 'Only org owner or developer can manage integrations', status: 403 };
  return { allowed: true };
}

const VALIDATORS = {
  stripe: validateStripeConfig,
  twilio: validateTwilioConfig,
  mailchimp: validateMailchimpConfig,
  resend: validateResendConfig,
};

const METADATA_BUILDERS = {
  stripe: stripeMetadataFromConfig,
  twilio: twilioMetadataFromConfig,
  mailchimp: mailchimpMetadataFromConfig,
  resend: resendMetadataFromConfig,
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.method === 'POST' ? req.body?.userId : req.query?.userId)?.trim();
  const organizationId = (req.method === 'POST' ? req.body?.organizationId : req.query?.organizationId)?.trim();
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!organizationId) return res.status(400).json({ error: 'Missing organizationId' });

  const auth = await requireOwnerOrDeveloper(userId, organizationId);
  if (auth.error) return res.status(auth.status || 403).json({ error: auth.error });

  if (req.method === 'GET') {
    const list = await listOrgIntegrations(organizationId);
    const providers = listProviders();
    const withMeta = providers.map((p) => {
      const saved = list.find((s) => s.provider === p.provider);
      return {
        provider: p.provider,
        name: p.name,
        description: p.description,
        status: saved?.status || 'pending',
        metadata: saved?.metadata_json || {},
        lastValidatedAt: saved?.last_validated_at || null,
      };
    });
    return res.status(200).json({ integrations: withMeta });
  }

  const { provider, action, config, metadata } = req.body || {};
  if (!provider || !['stripe', 'twilio', 'mailchimp', 'resend'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  if (!action || !['save', 'test'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action; use save or test' });
  }

  if (action === 'test') {
    const cfg = config && typeof config === 'object' ? config : (await getOrgIntegration(organizationId, provider))?.config;
    if (!cfg) return res.status(400).json({ error: 'No config to test; save credentials first or send config in request' });
    const validate = VALIDATORS[provider];
    if (!validate) return res.status(400).json({ error: 'Unknown provider' });
    try {
      const result = await validate(cfg);
      return res.status(200).json({ ok: result.ok, error: result.error, status: result.status });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e?.message || 'Validation failed' });
    }
  }

  if (action === 'save') {
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Missing config object' });
    }
    const validate = VALIDATORS[provider];
    const metaBuilder = METADATA_BUILDERS[provider];
    let status = 'pending';
    if (validate) {
      try {
        const result = await validate(config);
        status = result.ok ? 'connected' : 'invalid';
      } catch (_) {}
    }
    const meta = (metaBuilder && metaBuilder(config)) || metadata || {};
    const saveResult = await saveOrgIntegration(organizationId, provider, config, meta, status);
    if (saveResult.error) return res.status(500).json({ error: saveResult.error });
    return res.status(200).json({ success: true, status });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
