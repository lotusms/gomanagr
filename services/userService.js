import { supabase } from '@/lib/supabase';

const BUCKET_LOGO = 'company-logos';
const BUCKET_TEAM = 'team-photos';

function rowToAccount(row) {
  if (!row) return null;
  const profile = row.profile && typeof row.profile === 'object' ? row.profile : {};
  
  // Debug: log what we're converting
  console.log('[rowToAccount] Converting row:', {
    hasRow: !!row,
    first_name: row.first_name,
    last_name: row.last_name,
    profileFirstName: profile.firstName,
    profileLastName: profile.lastName,
  });
  
  const base = {
    userId: row.id,
    email: row.email,
    trial: row.trial ?? true,
    firstName: (row.first_name || profile.firstName || '').trim(),
    lastName: (row.last_name || profile.lastName || '').trim(),
    purpose: row.purpose,
    role: row.role,
    companyName: row.company_name,
    companyLogo: row.company_logo ?? '',
    teamSize: row.team_size,
    companySize: row.company_size,
    companyLocations: row.company_locations,
    industry: row.industry,
    sectionsToTrack: row.sections_to_track ?? [],
    referralSource: row.referral_source,
    reportingEmail: (row.reporting_email || profile.reportingEmail || row.email || '').trim(), // Normalized: always defaults to signup email
    selectedPalette: row.selected_palette ?? 'palette1',
    dismissedTodoIds: row.dismissed_todo_ids ?? [],
    teamMembers: row.team_members ?? [],
    clients: row.clients ?? [],
    services: row.services ?? [],
    appointments: row.appointments ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  // Merge profile, but base fields take precedence
  return { ...profile, ...base };
}

const KNOWN_KEYS = new Set([
  'userId', 'email', 'trial', 'firstName', 'lastName', 'purpose', 'role',
  'companyName', 'companyLogo', 'teamSize', 'companySize', 'companyLocations',
  'sectionsToTrack', 'referralSource', 'selectedPalette', 'dismissedTodoIds',
  'teamMembers', 'clients', 'services', 'appointments', 'createdAt', 'updatedAt',
  'industry', 'reportingEmail', // reportingEmail is handled specially - stored in profile JSONB
]);

function accountToRow(data) {
  const row = { updated_at: new Date().toISOString() };
  const profile = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (KNOWN_KEYS.has(key)) {
      if (key === 'userId') {
        row.id = value;
        row.user_id = value; // Ensure user_id always matches id
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
      else if (key === 'reportingEmail') {
        // ALWAYS store reportingEmail in profile JSONB, NOT as reporting_email column
        // This avoids the "column not found" error since the column doesn't exist
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
    console.warn('[userService] WARNING: reporting_email found in row after accountToRow, removing:', row.reporting_email);
    delete row.reporting_email;
  }
  
  return row;
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 * Buckets "company-logos" and "team-photos" must exist and be public in Supabase Dashboard.
 */
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/** List file paths in a storage folder. prefix e.g. "userId" or "userId/memberId". */
export async function listStorageFiles(bucket, prefix) {
  const { data, error } = await supabase.storage.from(bucket).list(prefix || '');
  if (error) throw error;
  const paths = [];
  (data || []).forEach((item) => {
    if (item.name) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      paths.push(path);
    }
  });
  return paths;
}

/** Get public URL for a storage path. */
export function getStoragePublicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Remove one or more files from storage. */
export async function removeStorageFiles(bucket, paths) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}

/**
 * Create or update user account (Supabase user_account table).
 * Uses API route with service role key to bypass RLS during signup.
 * @param {string} userId - The auth user ID (Supabase auth.uid())
 * @param {object} userData - User account data matching UserAccount schema
 * @param {File|null} logoFile - Optional logo file to upload to Supabase Storage
 * @returns {Promise<object>} The created/updated account data (camelCase)
 */
export async function createUserAccount(userId, userData, logoFile = null) {
  try {
    let logoUrl = userData.companyLogo || '';

    // Upload logo file if provided (client-side upload)
    if (logoFile) {
      try {
        const path = `${userId}/${logoFile.name}`;
        logoUrl = await uploadFile(BUCKET_LOGO, path, logoFile);
      } catch (storageError) {
        console.error('Logo upload error (continuing without logo):', storageError);
      }
    } else {
      // If no logo file but no logoUrl, try to preserve existing logo
      if (!logoUrl || logoUrl.trim() === '') {
        const existing = await getUserAccount(userId);
        if (existing?.companyLogo?.trim()) logoUrl = existing.companyLogo.trim();
      }
    }

    const now = new Date().toISOString();
    const accountData = { ...userData, companyLogo: logoUrl, updatedAt: now };
    if (!accountData.createdAt) accountData.createdAt = now;

    // Check if account already exists to preserve createdAt
    const existing = await getUserAccount(userId);
    if (existing?.createdAt) accountData.createdAt = existing.createdAt;

    // Call API route that uses service role key to bypass RLS
    const response = await fetch('/api/create-user-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userData: accountData,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON, try to get text
        const text = await response.text().catch(() => 'Unknown error');
        errorData = { message: text || `HTTP ${response.status}: ${response.statusText}` };
      }
      
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('[createUserAccount] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        fullError: errorData,
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`✅ User account ${existing ? 'updated' : 'created'} successfully for user: ${userId}`);
    return result;
  } catch (error) {
    console.error('Error creating/updating user account:', error);
    throw new Error('Failed to create user account: ' + error.message);
  }
}

/**
 * Get user account data.
 * @param {string} userId - The auth user ID
 * @returns {Promise<object|null>} Account in camelCase or null
 */
export async function getUserAccount(userId) {
  try {
    const { data, error } = await supabase
      .from('user_account')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    
    // Debug: log raw data from database
    if (data) {
      console.log('[getUserAccount] Raw database row:', {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        company_logo: data.company_logo,
        profile: data.profile,
      });
    }
    
    const account = rowToAccount(data);
    
    // Debug: log converted account
    if (account) {
      console.log('[getUserAccount] Converted account:', {
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        companyLogo: account.companyLogo,
      });
    }
    
    // If account doesn't exist but user is authenticated, try to create it
    if (!account && userId) {
      console.warn('[getUserAccount] Account not found for authenticated user, attempting to auto-create...');
      try {
        // Get current session to extract email and user metadata
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email;
        const userMetadata = session?.user?.user_metadata || {};
        
        // Try to extract firstName/lastName from metadata or email
        let firstName = userMetadata.firstName || userMetadata.first_name || '';
        let lastName = userMetadata.lastName || userMetadata.last_name || '';
        
        // If not in metadata, try to parse from email (fallback)
        if (!firstName && email) {
          const emailParts = email.split('@')[0].split(/[._-]/);
          if (emailParts.length >= 2) {
            firstName = emailParts[0];
            lastName = emailParts.slice(1).join(' ');
          }
        }
        
        if (email) {
          console.log('[getUserAccount] Auto-creating account for:', { 
            userId, 
            email,
            firstName: firstName || '(empty)',
            lastName: lastName || '(empty)',
          });
          // Create account via API route with available data
          const response = await fetch('/api/fix-missing-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              email: email,
              firstName: firstName,
              lastName: lastName,
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('[getUserAccount] Successfully auto-created missing account:', result);
            // Retry fetching the account
            const { data: newData, error: retryError } = await supabase
              .from('user_account')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (retryError) {
              console.error('[getUserAccount] Error fetching newly created account:', retryError);
            } else if (newData) {
              return rowToAccount(newData);
            }
          } else {
            const errorText = await response.text();
            console.error('[getUserAccount] Failed to auto-create account:', response.status, errorText);
          }
        } else {
          console.warn('[getUserAccount] Cannot auto-create account: email not available in session');
        }
      } catch (fixError) {
        console.error('[getUserAccount] Exception during auto-fix:', fixError);
      }
    }
    
    return account;
  } catch (error) {
    const msg = error.message || '';
    if (msg.includes('offline') || msg.includes('fetch') || error.code === 'PGRST301') {
      console.warn('Client is offline, returning null. Data will sync when connection is restored.');
      return null;
    }
    console.error('Error getting user account:', error);
    throw new Error('Failed to get user account: ' + error.message);
  }
}

/**
 * Get user account from server (same as getUserAccount; Supabase has no client cache).
 * @param {string} userId - The auth user ID
 * @returns {Promise<object|null>}
 */
export async function getUserAccountFromServer(userId) {
  return getUserAccount(userId);
}

export async function updateUserTheme(userId, paletteId) {
  const { error } = await supabase
    .from('user_account')
    .update({ 
      selected_palette: paletteId, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save theme preference: ' + error.message);
}

export async function updateDismissedTodos(userId, dismissedTodoIds) {
  const list = Array.isArray(dismissedTodoIds) ? dismissedTodoIds : [];
  const { error } = await supabase
    .from('user_account')
    .update({ 
      dismissed_todo_ids: list, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save dismissed todos: ' + error.message);
}

export async function updateTeamMembers(userId, teamMembers) {
  const list = Array.isArray(teamMembers) ? teamMembers : [];
  const { error } = await supabase
    .from('user_account')
    .update({ 
      team_members: list, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save team members: ' + error.message);
}

function cleanClient(client) {
  const cleanValue = (value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    if (Array.isArray(value)) {
      const cleaned = value.filter((item) => item != null && item !== '');
      return cleaned.length > 0 ? cleaned : undefined;
    }
    if (typeof value === 'object' && value !== null) {
      const cleaned = {};
      let hasValues = false;
      for (const [key, val] of Object.entries(value)) {
        const cleanedVal = cleanValue(val);
        if (cleanedVal !== undefined) {
          cleaned[key] = cleanedVal;
          hasValues = true;
        }
      }
      return hasValues ? cleaned : undefined;
    }
    return value;
  };
  const cleaned = {};
  for (const [key, value] of Object.entries(client)) {
    const cleanedVal = cleanValue(value);
    if (cleanedVal !== undefined) cleaned[key] = cleanedVal;
  }
  if (!cleaned.id && client.id) cleaned.id = client.id;
  if (!cleaned.name && client.name) cleaned.name = client.name;
  return cleaned;
}

export async function updateClients(userId, clients) {
  const cleaned = Array.isArray(clients) ? clients.map(cleanClient) : [];
  const { error } = await supabase
    .from('user_account')
    .update({ 
      clients: cleaned, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) {
    console.error('Supabase updateClients error:', error);
    throw new Error('Failed to save clients: ' + error.message);
  }
}

export async function updateServices(userId, services) {
  const list = Array.isArray(services) ? services : [];
  const { error } = await supabase
    .from('user_account')
    .update({ 
      services: list, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save services: ' + error.message);
}

export async function saveAppointment(userId, appointment) {
  const { data: existing } = await supabase.from('user_account').select('appointments').eq('id', userId).single();
  const appointments = existing?.appointments ?? [];
  const filtered = appointments.filter((apt) => apt.id !== appointment.id);
  filtered.push(appointment);
  const { error } = await supabase
    .from('user_account')
    .update({ 
      appointments: filtered, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save appointment: ' + error.message);
}

export async function deleteAppointment(userId, appointmentId) {
  const { data } = await supabase.from('user_account').select('appointments').eq('id', userId).single();
  if (!data) throw new Error('User account not found');
  const appointments = data.appointments ?? [];
  const filtered = appointments.filter((apt) => apt.id !== appointmentId);
  const { error } = await supabase
    .from('user_account')
    .update({ 
      appointments: filtered, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to delete appointment: ' + error.message);
}
