import { supabase } from '@/lib/supabase';

/**
 * Invite Service
 * Handles organization invitation operations
 */

/**
 * Generate a unique invite token
 */
function generateInviteToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create an invitation to join an organization
 * @param {string} organizationId - Organization ID
 * @param {string} email - Email to invite
 * @param {string} role - Role: 'admin', 'developer', or 'member'
 * @param {string} invitedByUserId - User ID of the person sending the invite
 * @param {Date} expiresAt - Optional expiration date (defaults to 7 days)
 * @returns {Promise<Object>} Created invite object
 */
export async function createInvite(organizationId, email, role = 'member', invitedByUserId, expiresAt = null) {
  try {
    if (!['admin', 'developer', 'member'].includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be 'admin', 'developer', or 'member'`);
    }

    const expirationDate = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const token = generateInviteToken();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('org_invites')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase().trim(),
        token,
        role,
        invited_by: invitedByUserId,
        expires_at: expirationDate.toISOString(),
        used: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[inviteService] Error creating invite:', error);
    throw error;
  }
}

/**
 * Get invite by token
 * @param {string} token - Invite token
 * @returns {Promise<Object|null>} Invite object with organization info
 */
export async function getInviteByToken(token) {
  try {
    const { data, error } = await supabase
      .from('org_invites')
      .select(`
        *,
        organization:organizations(*),
        invitedBy:user_profiles!org_invites_invited_by_fkey(id, email, first_name, last_name)
      `)
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null; // Expired
    }

    return data;
  } catch (error) {
    console.error('[inviteService] Error getting invite:', error);
    throw error;
  }
}

/**
 * Get all invites for an organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} Array of invite objects
 */
export async function getOrganizationInvites(organizationId) {
  try {
    const { data, error } = await supabase
      .from('org_invites')
      .select(`
        *,
        invitedBy:user_profiles!org_invites_invited_by_fkey(id, email, first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[inviteService] Error getting organization invites:', error);
    throw error;
  }
}

/**
 * Revoke an invite (mark as used or delete)
 * @param {string} inviteId - Invite ID
 * @returns {Promise<void>}
 */
export async function revokeInvite(inviteId) {
  try {
    const { error } = await supabase
      .from('org_invites')
      .delete()
      .eq('id', inviteId);

    if (error) throw error;
  } catch (error) {
    console.error('[inviteService] Error revoking invite:', error);
    throw error;
  }
}

/**
 * Generate invite link
 * @param {string} token - Invite token
 * @returns {string} Full invite URL
 */
export function getInviteLink(token) {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/accept-invite?invite=${token}`;
}
