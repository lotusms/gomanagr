/**
 * API route to create or update user account
 * Uses Supabase Admin API to bypass RLS during signup
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase Admin not configured for user account creation');
    supabaseAdmin = null;
  } else {
    // Use service role key for admin operations (bypasses RLS)
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
} catch (error) {
  console.error('Failed to initialize Supabase Admin:', error);
  supabaseAdmin = null;
}

// Helper function to convert camelCase account data to snake_case row
function accountToRow(data) {
  const KNOWN_KEYS = new Set([
    'userId', 'email', 'trial', 'trialEndsAt', 'firstName', 'lastName', 'purpose', 'role',
    'companyName', 'companyLogo', 'teamSize', 'companySize', 'companyLocations',
    'sectionsToTrack', 'referralSource', 'selectedPalette', 'dismissedTodoIds',
    'teamMembers', 'clients', 'services', 'appointments', 'createdAt', 'updatedAt',
    'industry', 'reportingEmail', // reportingEmail is handled specially - stored in profile JSONB
  ]);

  const row = { updated_at: new Date().toISOString() };
  const profile = {};
  
  Object.entries(data || {}).forEach(([key, value]) => {
    if (KNOWN_KEYS.has(key)) {
      if (key === 'userId') {
        row.id = value;
        row.user_id = value;
      }
      else if (key === 'firstName') row.first_name = value ? String(value).trim() : '';
      else if (key === 'lastName') row.last_name = value ? String(value).trim() : '';
      else if (key === 'companyName') row.company_name = value;
      else if (key === 'companyLogo') row.company_logo = value;
      else if (key === 'teamSize') row.team_size = value;
      else if (key === 'companySize') row.company_size = value;
      else if (key === 'companyLocations') row.company_locations = value;
      else if (key === 'sectionsToTrack') row.sections_to_track = value;
      else if (key === 'referralSource') row.referral_source = value;
      else if (key === 'selectedPalette') row.selected_palette = value;
      else if (key === 'dismissedTodoIds') row.dismissed_todo_ids = value;
      else if (key === 'teamMembers') row.team_members = value;
      else if (key === 'createdAt') row.created_at = value;
      else if (key === 'updatedAt') row.updated_at = value;
      else if (key === 'industry') row.industry = value;
      else if (key === 'trialEndsAt') {
        // Store trialEndsAt in profile JSONB if column doesn't exist, otherwise as column
        if (value) {
          row.trial_ends_at = value;
          profile.trialEndsAt = value; // Also store in profile as backup
        }
      }
      else if (key === 'reportingEmail') {
        // ALWAYS store reportingEmail in profile JSONB, NEVER as reporting_email column
        // This prevents the "column not found" error since the column doesn't exist
        // Normalize reportingEmail: always use signup email if empty
        profile.reportingEmail = (value || data.email || '').trim();
      }
      else row[key] = value;
    } else {
      profile[key] = value;
    }
  });
  
  // CRITICAL: Ensure reportingEmail is ALWAYS in profile (even if not provided)
  // This prevents the "column not found" error - reportingEmail is NEVER stored as a column
  if (!profile.reportingEmail && data.email) {
    // If reportingEmail wasn't provided, default to email (normalized behavior)
    profile.reportingEmail = data.email.trim();
  }
  
  // Always set profile on row (even if empty) to ensure reportingEmail is stored
  row.profile = profile;
  
  // CRITICAL: Remove reporting_email from row if it somehow exists (shouldn't happen)
  if (row.reporting_email !== undefined) {
    console.warn('[API] WARNING: reporting_email found in row after accountToRow, removing:', row.reporting_email);
    delete row.reporting_email;
  }
  
  return row;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ 
      error: 'service-unavailable',
      message: 'User account service is temporarily unavailable. Please try again later.'
    });
  }

  const { userId, userData } = req.body;

  if (!userId || !userData) {
    console.error('[API] Missing required fields:', { hasUserId: !!userId, hasUserData: !!userData });
    return res.status(400).json({ error: 'Missing userId or userData' });
  }

  try {
    const now = new Date().toISOString();
    const accountData = { 
      ...userData, 
      userId,
      updatedAt: now 
    };
    
    if (!accountData.createdAt) {
      accountData.createdAt = now;
    }
    
    // Normalize reportingEmail: always use signup email if not provided or empty
    // This ensures reportingEmail always matches the account email
    if (!accountData.reportingEmail || accountData.reportingEmail.trim() === '') {
      accountData.reportingEmail = accountData.email || '';
    }
    
    // Ensure reportingEmail is trimmed and matches email (normalized behavior)
    accountData.reportingEmail = (accountData.reportingEmail || accountData.email || '').trim();
    
    // Validate required fields are present
    if (!accountData.email) {
      console.error('[API] Missing required field: email');
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Ensure firstName and lastName are strings (even if empty)
    accountData.firstName = accountData.firstName || '';
    accountData.lastName = accountData.lastName || '';
    
    // Ensure teamMembers is an array
    if (!Array.isArray(accountData.teamMembers)) {
      accountData.teamMembers = accountData.teamMembers ? [accountData.teamMembers] : [];
    }

    // Ensure account owner is always created as the first team member
    // This is a safeguard in case teamMembers wasn't set during signup
    if (!accountData.teamMembers || !Array.isArray(accountData.teamMembers) || accountData.teamMembers.length === 0) {
      const firstName = (accountData.firstName || '').trim();
      const lastName = (accountData.lastName || '').trim();
      const companyName = (accountData.companyName || '').trim();
      const email = accountData.email || '';
      
      accountData.teamMembers = [{
        id: `owner-${userId}`,
        name: `${firstName} ${lastName}`.trim() || email.split('@')[0] || 'Account Owner',
        firstName: firstName,
        lastName: lastName,
        email: email,
        role: accountData.role || 'Owner',
        company: companyName,
        industry: accountData.industry || '',
        status: 'active',
        isOwner: true,
        isAdmin: true, // Account creator is always admin
      }];
      
      console.log('[API] Created account owner team member as safeguard:', {
        userId,
        teamMemberId: accountData.teamMembers[0].id,
        name: accountData.teamMembers[0].name,
      });
    }

    const row = accountToRow(accountData);
    row.id = userId;
    row.user_id = userId; // Always set user_id = id for RLS compatibility
    
    // Validate row has required fields before saving
    if (!row.email) {
      console.error('[API] Row missing required field: email', { rowKeys: Object.keys(row) });
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Ensure first_name and last_name are set (even if empty strings)
    if (row.first_name === undefined) row.first_name = '';
    if (row.last_name === undefined) row.last_name = '';

    // Try to upsert with all fields first
    let { data, error } = await supabaseAdmin
      .from('user_account')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    // If error is about missing column (like 'industry'), try again without it
    // Note: reportingEmail is now ALWAYS stored in profile JSONB, so it won't trigger this error
    if (error && error.message?.includes('column') && error.message?.includes('not found')) {
      console.warn('[API] Column not found in schema, retrying without problematic fields:', error.message);
      
      // Remove industry from row if it exists (store in profile instead)
      if (row.industry !== undefined) {
        if (!row.profile) row.profile = {};
        row.profile.industry = row.industry;
        delete row.industry;
      }
      
      // Ensure reportingEmail is in profile (should already be there, but double-check)
      if (!row.profile) row.profile = {};
      if (!row.profile.reportingEmail) {
        row.profile.reportingEmail = (row.email || '').trim();
      }
      
      // Remove any reporting_email if it somehow got in there
      if (row.reporting_email !== undefined) {
        row.profile.reportingEmail = (row.reporting_email || row.email || '').trim();
        delete row.reporting_email;
      }
            
      // Retry without the problematic column
      const retryResult = await supabaseAdmin
        .from('user_account')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      
      if (retryResult.error) {
        console.error('[API] Supabase upsert error (retry):', {
          error: retryResult.error,
          message: retryResult.error.message,
          code: retryResult.error.code,
          details: retryResult.error.details,
          userId,
        });
        throw retryResult.error;
      }
      
      data = retryResult.data;
      error = null;
      
      console.log('[API] Retry successful, saved data:', {
        userId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        company_name: data.company_name,
        team_members_count: data.team_members?.length || 0,
      });
    }

    if (error) {
      console.error('[API] Supabase upsert error:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        rowKeys: Object.keys(row),
      });
      throw error;
    }

    // Convert row back to camelCase for response
    const profile = data.profile && typeof data.profile === 'object' ? data.profile : {};
    const response = {
      userId: data.id,
      email: data.email,
      trial: data.trial ?? true,
      trialEndsAt: data.trial_ends_at || profile.trialEndsAt || null,
      firstName: data.first_name || profile.firstName || '',
      lastName: data.last_name || profile.lastName || '',
      purpose: data.purpose,
      role: data.role,
      companyName: data.company_name,
      companyLogo: data.company_logo ?? '',
      companyLocations: data.company_locations,
      industry: data.industry || profile.industry || '', // Check both column and profile
      sectionsToTrack: data.sections_to_track ?? [],
      referralSource: data.referral_source,
      reportingEmail: (profile.reportingEmail || data.email || '').trim(), // Always from profile JSONB, normalized to signup email
      selectedPalette: data.selected_palette ?? 'palette1',
      dismissedTodoIds: data.dismissed_todo_ids ?? [],
      teamMembers: data.team_members ?? [],
      clients: data.clients ?? [],
      services: data.services ?? [],
      appointments: data.appointments ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      ...profile,
    };

    console.log('[API] Returning response:', {
      userId: response.userId,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
    });
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('[API] Error in create-user-account API:', {
      error,
      message: error.message,
      stack: error.stack,
      userId: req.body?.userId,
    });
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Failed to create user account'
    });
  }
}
