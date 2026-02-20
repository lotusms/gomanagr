import { supabase } from '@/lib/supabase';

/**
 * Organization Service
 * Handles organization and org_member operations
 */

/**
 * Get user's current organization (first org they're a member of)
 * @param {string} userId - User's Firebase Auth UID
 * @returns {Promise<Object|null>} Organization object with membership info
 */
export async function getUserOrganization(userId) {
  try {
    const { data, error } = await supabase
      .from('org_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data.organization,
      membership: {
        id: data.id,
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error) {
    console.error('[organizationService] Error getting user organization:', error);
    throw error;
  }
}

/**
 * Get all organizations a user is a member of
 * @param {string} userId - User's Firebase Auth UID
 * @returns {Promise<Array>} Array of organizations with membership info
 */
export async function getUserOrganizations(userId) {
  try {
    const { data, error } = await supabase
      .from('org_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((item) => ({
      ...item.organization,
      membership: {
        id: item.id,
        role: item.role,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      },
    }));
  } catch (error) {
    console.error('[organizationService] Error getting user organizations:', error);
    throw error;
  }
}

/**
 * Create a new organization
 * @param {Object} orgData - Organization data
 * @param {string} orgData.name - Organization name
 * @param {string} [orgData.logo_url] - Logo URL
 * @param {string} [orgData.industry] - Industry
 * @param {string} [orgData.company_size] - Company size
 * @param {string} [orgData.company_locations] - Company locations
 * @param {string} [orgData.team_size] - Team size
 * @param {Array} [orgData.sections_to_track] - Sections to track
 * @param {boolean} [orgData.trial] - Trial status
 * @param {string} [orgData.trial_ends_at] - Trial end date
 * @returns {Promise<Object>} Created organization
 */
export async function createOrganization(orgData) {
  try {
    const now = new Date().toISOString();
    const organization = {
      name: orgData.name,
      logo_url: orgData.logo_url || '',
      industry: orgData.industry || '',
      company_size: orgData.company_size || '',
      company_locations: orgData.company_locations || '',
      team_size: orgData.team_size || '',
      sections_to_track: orgData.sections_to_track || [],
      trial: orgData.trial !== undefined ? orgData.trial : true,
      trial_ends_at: orgData.trial_ends_at || null,
      selected_palette: orgData.selected_palette || 'palette1',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('organizations')
      .insert(organization)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[organizationService] Error creating organization:', error);
    throw error;
  }
}

/**
 * Add a user to an organization
 * @param {string} organizationId - Organization ID
 * @param {string} userId - User ID
 * @param {string} role - Role: 'admin', 'developer', or 'member'
 * @returns {Promise<Object>} Created org_member entry
 */
export async function addUserToOrganization(organizationId, userId, role = 'member') {
  try {
    if (!['admin', 'developer', 'member'].includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be 'admin', 'developer', or 'member'`);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('org_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      // If user is already a member, return existing membership
      if (error.code === '23505') { // Unique violation
        const { data: existing } = await supabase
          .from('org_members')
          .select()
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .single();
        return existing;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[organizationService] Error adding user to organization:', error);
    throw error;
  }
}

/**
 * Update user's role in an organization
 * @param {string} organizationId - Organization ID
 * @param {string} userId - User ID
 * @param {string} role - New role: 'admin', 'developer', or 'member'
 * @returns {Promise<Object>} Updated org_member entry
 */
export async function updateUserRole(organizationId, userId, role) {
  try {
    if (!['admin', 'developer', 'member'].includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be 'admin', 'developer', or 'member'`);
    }

    const { data, error } = await supabase
      .from('org_members')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[organizationService] Error updating user role:', error);
    throw error;
  }
}

/**
 * Remove a user from an organization
 * @param {string} organizationId - Organization ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function removeUserFromOrganization(organizationId, userId) {
  try {
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('[organizationService] Error removing user from organization:', error);
    throw error;
  }
}

/**
 * Get all members of an organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} Array of org members with user profiles
 */
export async function getOrganizationMembers(organizationId) {
  try {
    const { data, error } = await supabase
      .from('org_members')
      .select(`
        *,
        user:user_profiles(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[organizationService] Error getting organization members:', error);
    throw error;
  }
}

/**
 * Update organization data
 * @param {string} organizationId - Organization ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated organization
 */
export async function updateOrganization(organizationId, updates) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[organizationService] Error updating organization:', error);
    throw error;
  }
}
