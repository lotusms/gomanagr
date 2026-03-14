/**
 * Load organization integration from DB. Decrypts config server-side.
 * Use only in API routes / server code. Never send raw config to client.
 */

import { createClient } from '@supabase/supabase-js';
import { decryptConfig } from './encryption.js';

let supabaseAdmin;
function getSupabaseAdmin() {
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

/**
 * Get decrypted config for an org + provider. Returns null if not found or decryption fails.
 * @param {string} organizationId - UUID
 * @param {string} provider - 'stripe' | 'twilio' | 'mailchimp' | 'resend'
 * @returns {Promise<{ config: Object, row: Object }|null>}
 */
async function getOrgIntegration(organizationId, provider) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !organizationId || !provider) return null;
  const { data: row, error } = await supabase
    .from('organization_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .maybeSingle();
  if (error || !row || !row.config_encrypted) return null;
  const result = decryptConfig(row.config_encrypted);
  if (result.error || !result.decrypted) return null;
  return { config: result.decrypted, row };
}

/**
 * Get all integrations for an org (for Settings list). Does NOT decrypt; returns metadata + status only.
 * @param {string} organizationId
 * @returns {Promise<Array<{ provider: string, status: string, metadata_json: Object, last_validated_at: string|null }>>}
 */
async function listOrgIntegrations(organizationId) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !organizationId) return [];
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('provider, status, metadata_json, last_validated_at')
    .eq('organization_id', organizationId);
  if (error) return [];
  return data || [];
}

/**
 * Upsert integration: encrypt config and save. Call from API after validation.
 * @param {string} organizationId
 * @param {string} provider
 * @param {Object} config - Plain config to encrypt
 * @param {Object} metadata - Non-secret display info (masked key suffix, sender email, etc.)
 * @param {string} status - 'connected' | 'disconnected' | 'invalid' | 'pending'
 * @returns {Promise<{ error?: string }>}
 */
async function saveOrgIntegration(organizationId, provider, config, metadata = {}, status = 'pending') {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Service unavailable' };
  const { encryptConfig } = await import('./encryption.js');
  const result = encryptConfig(config);
  if (result.error) return { error: result.error };
  const { error } = await supabase
    .from('organization_integrations')
    .upsert(
      {
        organization_id: organizationId,
        provider,
        status,
        config_encrypted: result.encrypted,
        metadata_json: metadata || {},
        last_validated_at: status === 'connected' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,provider' }
    );
  if (error) return { error: error.message };
  return {};
}

/**
 * Get masked summary for UI (no secrets). Merge metadata with provider-specific masking.
 */
async function getOrgIntegrationSummary(organizationId, provider) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !organizationId || !provider) return null;
  const { data: row, error } = await supabase
    .from('organization_integrations')
    .select('provider, status, metadata_json, last_validated_at')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .maybeSingle();
  if (error || !row) return null;
  return {
    provider: row.provider,
    status: row.status,
    metadata: row.metadata_json || {},
    lastValidatedAt: row.last_validated_at,
  };
}

export {
  getOrgIntegration,
  listOrgIntegrations,
  saveOrgIntegration,
  getOrgIntegrationSummary,
};
