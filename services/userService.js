import { supabase } from '@/lib/supabase';

const BUCKET_LOGO = 'company-logos';
const BUCKET_TEAM = 'team-photos';

function rowToAccount(row) {
  if (!row) return null;
  const profile = row.profile && typeof row.profile === 'object' ? row.profile : {};
  
  const base = {
    userId: row.id,
    email: row.email,
    trial: row.trial ?? true,
    trialEndsAt: row.trial_ends_at || profile.trialEndsAt || null,
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
    developerMode: profile.developerMode ?? false, // Developer mode flag (stored in profile JSONB)
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...profile, ...base };
}

const KNOWN_KEYS = new Set([
  'userId', 'email', 'trial', 'trialEndsAt', 'firstName', 'lastName', 'purpose', 'role',
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
      else if (key === 'trialEndsAt') {
        if (value) {
          row.trial_ends_at = value;
          profile.trialEndsAt = value; // Also store in profile as backup
        }
      }
      else if (key === 'reportingEmail') {
        profile.reportingEmail = (value || data.email || '').trim();
      }
      else row[key] = value;
    } else {
      profile[key] = value;
    }
  });
  
  if (!profile.reportingEmail && data.email) {
    profile.reportingEmail = data.email.trim();
  }
  
  row.profile = profile;
  
  if (row.reporting_email !== undefined) {
    console.warn('[userService] WARNING: reporting_email found in row after accountToRow, removing:', row.reporting_email);
    delete row.reporting_email;
  }
  
  return row;
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 * Buckets "company-logos" and "team-photos" must exist and be public in Supabase Dashboard.
 * NOTE: For team photos, use uploadTeamPhoto instead (uses API route with service role).
 */
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Upload a team member photo via API route (uses service role to bypass RLS).
 * @param {string} userId - The user ID (owner of the team)
 * @param {string} memberId - The team member ID
 * @param {File} photoFile - The photo file to upload
 * @returns {Promise<string>} The public URL of the uploaded photo
 */
export async function uploadTeamPhoto(userId, memberId, photoFile) {
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(photoFile);
    });
    
    const photoData = {
      base64,
      filename: photoFile.name,
      contentType: photoFile.type || 'image/png'
    };

    const response = await fetch('/api/upload-team-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        memberId,
        photoData
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const text = await response.text().catch(() => 'Unknown error');
        errorData = { message: text || `HTTP ${response.status}: ${response.statusText}` };
      }
      
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('[uploadTeamPhoto] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        fullError: errorData,
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.photoUrl;
  } catch (error) {
    console.error('Error uploading team photo:', error);
    throw new Error('Failed to upload team photo: ' + error.message);
  }
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
 * Create or update user account (Supabase user_profiles table).
 * Uses API route with service role key to bypass RLS during signup.
 * @param {string} userId - The auth user ID (Supabase auth.uid())
 * @param {object} userData - User account data matching UserAccount schema
 * @param {File|null} logoFile - Optional logo file to upload to Supabase Storage
 * @param {string|null} inviteToken - Optional invite token for joining existing organization
 * @param {string|null} accessToken - Optional JWT (e.g. from signUp response) for invite flow
 * @returns {Promise<object>} The created/updated account data (camelCase)
 */
export async function createUserAccount(userId, userData, logoFile = null, inviteToken = null, accessToken = null) {
  try {
    const now = new Date().toISOString();
    const accountData = { ...userData, updatedAt: now };
    if (!accountData.createdAt) accountData.createdAt = now;

    const existing = await getUserAccount(userId);
    if (existing?.createdAt) accountData.createdAt = existing.createdAt;

    let logoData = null;
    if (logoFile) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
        
        logoData = {
          base64,
          filename: logoFile.name,
          contentType: logoFile.type || 'image/png'
        };
      } catch (logoErr) {
        console.error('Error preparing logo data:', logoErr);
      }
    }

    const tokenToSend = accessToken || (await supabase.auth.getSession()).data?.session?.access_token;
    const response = await fetch('/api/create-user-account-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenToSend ? { Authorization: `Bearer ${tokenToSend}` } : {}),
      },
      body: JSON.stringify({
        userId,
        userData: accountData,
        inviteToken: inviteToken || null, // Pass invite token parameter
        logoData: logoData, // Pass logo data for server-side upload
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
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
      
      const error = new Error(errorMessage);
      error.responseData = errorData;
      error.status = response.status;
      throw error;
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
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    
    
    const account = rowToAccount(data);
    
    if (!account && userId) {
      console.warn('[getUserAccount] Account not found for authenticated user, attempting to auto-create...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email;
        const userMetadata = session?.user?.user_metadata || {};
        
        let firstName = userMetadata.firstName || userMetadata.first_name || '';
        let lastName = userMetadata.lastName || userMetadata.last_name || '';
        
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
            const { data: newData, error: retryError } = await supabase
              .from('user_profiles')
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
    .from('user_profiles')
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
    .from('user_profiles')
    .update({ 
      dismissed_todo_ids: list, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save dismissed todos: ' + error.message);
}

/**
 * Dismiss a todo by id: updates server and returns the new dismissed ids list for local state.
 * Use in dashboard and team-member pages to avoid duplicated logic.
 * @param {string} userId - Current user id
 * @param {string} todoId - Todo item id to dismiss
 * @param {Array<string>} currentDismissedIds - Current dismissed_todo_ids (or null/undefined)
 * @returns {Promise<string[]|null>} Resolves with the new dismissed ids array, or null if nothing to do
 */
export async function dismissTodo(userId, todoId, currentDismissedIds) {
  if (!userId || !todoId) return null;
  const list = Array.isArray(currentDismissedIds) ? currentDismissedIds : [];
  const next = list.includes(todoId) ? list : [...list, todoId];
  await updateDismissedTodos(userId, next);
  return next;
}

export async function updateTeamMembers(userId, teamMembers) {
  const list = Array.isArray(teamMembers) ? teamMembers : [];
  
  console.log('[updateTeamMembers] Starting update for userId:', userId, 'teamMembers count:', list.length);
  
  const { data: existingProfile, error: checkError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (checkError) {
    console.error('[updateTeamMembers] Profile check failed:', {
      error: checkError.message,
      code: checkError.code,
      details: checkError.details,
      hint: checkError.hint,
      userId
    });
    throw new Error('Profile not found or access denied: ' + checkError.message);
  }
  
  if (!existingProfile) {
    console.error('[updateTeamMembers] Profile does not exist for userId:', userId);
    throw new Error('Profile not found for user: ' + userId);
  }
  
  console.log('[updateTeamMembers] Profile exists, proceeding with update');
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ 
      team_members: list, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId)
    .select(); // Select to verify update worked
    
  if (error) {
    console.error('[updateTeamMembers] Update failed with RLS error:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      operation: 'UPDATE',
      table: 'user_profiles'
    });
    
    if (error.message.includes('new row') || error.code === '42501') {
      console.error('[updateTeamMembers] ERROR: This looks like an INSERT operation was attempted, but we used .update()');
      console.error('[updateTeamMembers] This suggests an RLS policy issue or Supabase client bug');
    }
    
    throw new Error('Failed to save team members: ' + error.message);
  }
  
  if (!data || data.length === 0) {
    console.warn('[updateTeamMembers] Update returned no rows - this might indicate RLS blocked the update');
    throw new Error('Update completed but no rows were returned. Check RLS policies.');
  }
  
  console.log('[updateTeamMembers] Update successful, rows updated:', data.length);
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
    .from('user_profiles')
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
    .from('user_profiles')
    .update({ 
      services: list, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save services: ' + error.message);
}

export async function saveAppointment(userId, appointment) {
  const { data: existing } = await supabase.from('user_profiles').select('appointments').eq('id', userId).single();
  const appointments = existing?.appointments ?? [];
  const filtered = appointments.filter((apt) => apt.id !== appointment.id);
  filtered.push(appointment);
  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      appointments: filtered, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to save appointment: ' + error.message);
}

/**
 * Delete user account (both database record and auth user)
 * @param {string} userId - The auth user ID
 * @returns {Promise<void>}
 */
export async function deleteUserAccount(userId) {
  const response = await fetch('/api/delete-user-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => 'Unknown error');
      errorData = { message: text || `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export async function deleteAppointment(userId, appointmentId) {
  const { data } = await supabase.from('user_profiles').select('appointments').eq('id', userId).single();
  if (!data) throw new Error('User account not found');
  const appointments = data.appointments ?? [];
  const filtered = appointments.filter((apt) => apt.id !== appointmentId);
  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      appointments: filtered, 
      user_id: userId, // Ensure user_id is set for RLS
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  if (error) throw new Error('Failed to delete appointment: ' + error.message);
}
