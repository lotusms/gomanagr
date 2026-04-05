/**
 * Push all organization clients with email to the Mailchimp "GoManagr Contacts" audience.
 * Used after client changes and from the manual sync API.
 */

import {
  getMailchimpCredentials,
  findOrCreateList,
  batchAddMembers,
} from '@/lib/marketing/mailchimpApiService';

/**
 * Map merged org client objects to Mailchimp batch members.
 * @param {object} client
 * @returns {{ email: string, firstName?: string, lastName?: string, name?: string }|null}
 */
export function clientToMailchimpMember(client) {
  if (!client || typeof client !== 'object') return null;
  const email = String(client.email || '')
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  let firstName = String(client.firstName || '').trim();
  let lastName = String(client.lastName || '').trim();
  if (!firstName && !lastName && client.name) {
    const parts = String(client.name).trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  return {
    email,
    firstName,
    lastName,
    name: client.name ? String(client.name).trim() : undefined,
  };
}

/**
 * Load merged client list for an org (same merge rules as get-org-clients, without display enrichment).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} organizationId
 * @returns {Promise<object[]>}
 */
export async function loadMergedOrgClients(supabaseAdmin, organizationId) {
  const { data: orgMemberRows, error: orgMemErr } = await supabaseAdmin
    .from('org_members')
    .select('user_id')
    .eq('organization_id', organizationId);

  if (orgMemErr || !orgMemberRows?.length) return [];

  const orgUserIds = orgMemberRows.map((r) => r.user_id).filter(Boolean);
  const { data: profileRows, error: profilesErr } = await supabaseAdmin
    .from('user_profiles')
    .select('clients')
    .in('id', orgUserIds);

  if (profilesErr || !profileRows?.length) return [];

  const all = [];
  for (const row of profileRows) {
    const rowClients = Array.isArray(row.clients) ? row.clients : [];
    for (const c of rowClients) {
      if (c && typeof c === 'object' && c.status !== 'inactive') {
        all.push(c);
      }
    }
  }

  const byEmail = new Map();
  for (const c of all) {
    const m = clientToMailchimpMember(c);
    if (!m) continue;
    if (!byEmail.has(m.email)) byEmail.set(m.email, m);
  }

  return [...byEmail.values()];
}

/**
 * @param {string} organizationId
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @returns {Promise<{ success: boolean, synced: number, error?: string, batch?: object }>}
 */
export async function syncOrgClientsToMailchimp(organizationId, supabaseAdmin) {
  if (!organizationId || !supabaseAdmin) {
    return { success: false, synced: 0, error: 'Missing organization or database' };
  }

  const creds = await getMailchimpCredentials(organizationId);
  if (!creds?.apiKey || !creds?.serverPrefix) {
    return { success: false, synced: 0, error: 'Mailchimp is not connected for this organization' };
  }
  if (!creds.senderEmail) {
    return {
      success: false,
      synced: 0,
      error: 'Mailchimp sender email is not configured in Settings > Integrations',
    };
  }

  const members = await loadMergedOrgClients(supabaseAdmin, organizationId);
  if (members.length === 0) {
    return { success: true, synced: 0, batch: { total_created: 0, total_updated: 0, error_count: 0 } };
  }

  const listId = await findOrCreateList(
    creds.apiKey,
    creds.serverPrefix,
    creds.senderEmail,
    creds.senderName
  );
  const batch = await batchAddMembers(creds.apiKey, creds.serverPrefix, listId, members);

  return {
    success: true,
    synced: members.length,
    batch,
  };
}
