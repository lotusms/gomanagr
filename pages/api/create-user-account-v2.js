/**
 * API route to create user account with multi-tenant organization support
 * Handles two cases:
 * Case A: Normal signup (no invite) - creates org and adds user as admin
 * Case B: Invited signup - adds user to existing org with specified role
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;
/** Anon client used only to verify user JWT (who is making the request). */
let supabaseAnon;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase Admin not configured for user account creation');
    console.error('Missing:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 10) : 'N/A'
    });
    supabaseAdmin = null;
  } else {
    // Verify service key format (should start with 'eyJ' for JWT)
    if (!supabaseServiceKey.startsWith('eyJ')) {
      console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY does not look like a valid JWT token');
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    if (supabaseUrl && supabaseAnonKey) {
      supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    } else {
      supabaseAnon = null;
    }
    console.log('[API] Supabase Admin initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Supabase Admin:', error);
  supabaseAdmin = null;
  supabaseAnon = null;
}

/**
 * Get the authenticated user id from the request (Authorization: Bearer <jwt>).
 * Returns null if no valid token or verification fails.
 */
async function getAuthenticatedUserId(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token || !supabaseAnon) return null;
  try {
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    if (error || !user?.id) return null;
    return user.id;
  } catch (_) {
    return null;
  }
}

// Row keys that go into user_profiles columns (not into profile JSONB)
const ROW_KEYS = new Set([
  'userId', 'id', 'email', 'firstName', 'lastName', 'purpose', 'role',
  'createdAt', 'updatedAt',
]);

// Helper to convert camelCase user data to snake_case row + profile JSONB
function userDataToRow(data) {
  const profile = {};
  const row = {
    id: data.userId,
    user_id: data.userId,
    email: data.email?.toLowerCase() || '',
    first_name: (data.firstName || '').trim(),
    last_name: (data.lastName || '').trim(),
    purpose: (data.purpose || '').trim(),
    role: (data.role || '').trim(),
    created_at: data.createdAt || new Date().toISOString(),
    updated_at: data.updatedAt || new Date().toISOString(),
  };

  // Put everything else into profile JSONB (name, title, bio, pictureUrl, address, etc.)
  Object.entries(data || {}).forEach(([key, value]) => {
    if (ROW_KEYS.has(key) || value === undefined) return;
    if (key === 'reportingEmail') {
      profile.reportingEmail = (value || data.email || '').trim();
      return;
    }
    profile[key] = value;
  });
  if (data.reportingEmail != null && data.reportingEmail !== '') {
    profile.reportingEmail = (data.reportingEmail || data.email || '').trim();
  }
  if (data.developerMode !== undefined) profile.developerMode = data.developerMode;
  if (data.nameView != null) profile.nameView = data.nameView;

  row.profile = profile;
  return row;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ 
      error: 'service-unavailable',
      message: 'User account service is temporarily unavailable.'
    });
  }

  // Verify service role key is properly configured
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !serviceKey.startsWith('eyJ')) {
    console.error('[API] CRITICAL: Invalid service role key format');
    return res.status(503).json({ 
      error: 'service-unavailable',
      message: 'Service role key is not properly configured.'
    });
  }

  const { userId, userData, inviteToken, logoData } = req.body;
  // logoData: { base64: string, filename: string } or null

  if (!userId || !userData) {
    return res.status(400).json({ error: 'Missing userId or userData' });
  }

  // Ensure the caller can only update their own account (team member vs admin isolation)
  const authenticatedUserId = await getAuthenticatedUserId(req);
  if (authenticatedUserId != null && authenticatedUserId !== userId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only update your own account settings.',
    });
  }
  if (authenticatedUserId == null) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid session required to update account.',
    });
  }

  // Store userId for cleanup if needed
  let authUserId = userId;

  try {
    const now = new Date().toISOString();
    
    // Step 1: Create user profile
    const userRow = userDataToRow({
      ...userData,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    // Use service role to bypass RLS - this should work
    // Verify service role is configured
    if (!supabaseAdmin) {
      const error = new Error('Supabase Admin client not initialized');
      console.error('[API] CRITICAL: Service role not available');
      
      // Delete auth user before returning error
      try {
        // Try to create a temporary admin client for cleanup
        const tempAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await tempAdmin.auth.admin.deleteUser(userId);
        console.log('[API] Deleted auth user (service role was missing)');
      } catch (cleanupErr) {
        console.error('[API] Failed to cleanup auth user:', cleanupErr);
      }
      
      return res.status(503).json({ 
        error: 'service-unavailable',
        message: 'Service role key not configured. Cannot create user account.'
      });
    }

    // Verify service role can bypass RLS by testing a simple query
    // This helps diagnose RLS issues early
    try {
      const { error: testError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (testError && (testError.message?.includes('row-level security') || testError.code === '42501')) {
        console.error('[API] CRITICAL: Service role cannot bypass RLS!');
        console.error('[API] This indicates SUPABASE_SERVICE_ROLE_KEY is incorrect or not being used');
        console.error('[API] Test error:', testError);
        
        // Delete auth user before returning
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log('[API] Deleted auth user (service role verification failed)');
        } catch (cleanupErr) {
          console.error('[API] Failed to cleanup:', cleanupErr);
        }
        
        return res.status(500).json({ 
          error: 'service-role-invalid',
          message: 'Service role key is not properly configured or does not bypass RLS. Check SUPABASE_SERVICE_ROLE_KEY environment variable.'
        });
      }
    } catch (testErr) {
      // Test query failed, but continue - might be empty table
      console.log('[API] Service role test query result (may be empty table):', testErr.message);
    }

    // Check if profile already exists (from previous failed signup)
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    let userProfile;
    let userError;

    if (existingProfile) {
      // Profile exists, use update instead of insert
      console.log('[API] Profile already exists, updating:', userId);
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update(userRow)
        .eq('id', userId)
        .select()
        .single();
      userProfile = data;
      userError = error;
    } else {
      // New profile, use insert (service role bypasses RLS)
      console.log('[API] Creating new profile:', userId);
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .insert(userRow)
        .select()
        .single();
      userProfile = data;
      userError = error;
    }

    if (userError) {
      console.error('[API] Error creating user profile:', {
        error: userError,
        message: userError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint,
        userId,
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'NOT SET',
      });
      
      // If RLS error, try to provide helpful message
      if (userError.message?.includes('row-level security') || userError.code === '42501') {
        console.error('[API] RLS policy violation - service role should bypass RLS');
        console.error('[API] Check that SUPABASE_SERVICE_ROLE_KEY is set correctly');
        console.error('[API] Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.error('[API] Service key starts with eyJ:', process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ'));
      }
      
      // CRITICAL: Delete auth user BEFORE returning error
      // This must complete before we send the response
      let cleanupSuccess = false;
      try {
        const deleteResult = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (!deleteResult.error) {
          cleanupSuccess = true;
          console.log('[API] Successfully deleted auth user due to profile creation failure');
        } else {
          console.error('[API] Failed to delete auth user:', deleteResult.error);
        }
      } catch (deleteErr) {
        console.error('[API] Exception during auth user cleanup:', deleteErr);
      }
      
      // Return error with cleanup status
      return res.status(500).json({ 
        error: 'profile-creation-failed',
        message: userError.message || 'Failed to create user profile',
        cleanupAttempted: true,
        cleanupSuccess,
        details: userError.code === '42501' ? 'RLS policy violation - check service role key configuration' : undefined
      });
    }

    let organizationId;
    let membershipRole = 'admin';
    let userAlreadyInOrg = false;

    // Step 2: Handle organization creation/assignment
    if (inviteToken) {
      // Case B: Invited signup - add to existing org
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from('org_invites')
        .select('organization_id, role, email, expires_at')
        .eq('token', inviteToken)
        .eq('used', false)
        .single();

      if (inviteError || !invite) {
        return res.status(400).json({ error: 'Invalid or expired invite token' });
      }

      // Check if invite is expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invite token has expired' });
      }

      // Verify email matches (optional but recommended)
      if (invite.email && invite.email.toLowerCase() !== userData.email?.toLowerCase()) {
        return res.status(400).json({ error: 'Invite email does not match signup email' });
      }

      organizationId = invite.organization_id;
      membershipRole = invite.role || 'member';

      // Mark invite as used
      await supabaseAdmin
        .from('org_invites')
        .update({ 
          used: true, 
          used_at: now, 
          used_by: userId,
          updated_at: now
        })
        .eq('token', inviteToken);
    } else {
      // Case A: Normal signup - use existing org if user already in one, else create one
      const { data: existingMembership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (existingMembership?.organization_id) {
        organizationId = existingMembership.organization_id;
        membershipRole = 'admin';
        userAlreadyInOrg = true;
      } else {
        const orgData = {
          name: userData.companyName || 'My Organization',
          logo_url: '',
          industry: userData.industry || '',
          company_size: userData.companySize || '',
          company_locations: userData.companyLocations || '',
          team_size: userData.teamSize || '',
          sections_to_track: userData.sectionsToTrack || [],
          trial: userData.trial !== undefined ? userData.trial : true,
          trial_ends_at: userData.trialEndsAt || null,
          selected_palette: userData.selectedPalette || 'palette1',
          created_at: now,
          updated_at: now,
        };

        const { data: organization, error: orgError } = await supabaseAdmin
          .from('organizations')
          .insert(orgData)
          .select()
          .single();

        if (orgError) {
          console.error('[API] Error creating organization:', orgError);
          throw orgError;
        }

        organizationId = organization.id;
        membershipRole = 'admin';
      }

      // Upload logo to organization-specific path if provided
      if (logoData && logoData.base64 && organizationId) {
        try {
          // Convert base64 to buffer
          const base64Data = logoData.base64.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Use organization ID in the path: {organizationId}/logo/{filename}
          const filename = logoData.filename || `logo-${Date.now()}.png`;
          const logoPath = `${organizationId}/logo/${filename}`;
          
          // Upload to storage bucket using service role
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('company-logos')
            .upload(logoPath, buffer, {
              contentType: logoData.contentType || 'image/png',
              upsert: true
            });

          if (uploadError) {
            console.error('[API] Error uploading logo:', uploadError);
            // Don't fail - continue without logo
          } else {
            // Get public URL
            const { data: urlData } = supabaseAdmin.storage
              .from('company-logos')
              .getPublicUrl(uploadData.path);
            
            // Update organization with logo URL
            await supabaseAdmin
              .from('organizations')
              .update({ 
                logo_url: urlData.publicUrl,
                updated_at: now
              })
              .eq('id', organizationId);
            
            console.log('[API] Logo uploaded successfully to:', logoPath);
          }
        } catch (logoErr) {
          console.error('[API] Exception during logo upload:', logoErr);
          // Don't fail - continue without logo
        }
      }
    }

    // Step 3: Add user to organization (skip if already in an org, e.g. from previous signup)
    if (!userAlreadyInOrg) {
      const { data: membership, error: memberError } = await supabaseAdmin
        .from('org_members')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role: membershipRole,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (memberError) {
        console.error('[API] Error creating org membership:', memberError);
        let cleanupSuccess = false;
        try {
          await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
          const deleteResult = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (!deleteResult.error) cleanupSuccess = true;
        } catch (cleanupErr) {
          console.error('[API] Failed to cleanup after membership error:', cleanupErr);
        }
        return res.status(500).json({
          error: 'membership-creation-failed',
          message: memberError.message || 'Failed to create organization membership',
          cleanupAttempted: true,
          cleanupSuccess,
        });
      }
    }

    // Step 4: Add user as team member in user_profiles.team_members array
    // This ensures the user appears on the Teams page automatically
    const teamMember = {
      id: `owner-${userId}`,
      name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email.split('@')[0] || 'Account Owner',
      firstName: userProfile.first_name || '',
      lastName: userProfile.last_name || '',
      email: userProfile.email,
      role: userProfile.role || '',
      company: userData.companyName || '',
      industry: userData.industry || '',
      status: 'active',
      isOwner: true,
      isAdmin: true, // Account creator is always admin
    };

    // Get current team_members array (may be empty or null)
    const currentTeamMembers = userProfile.team_members || [];
    
    // Check if team member already exists (from previous failed signup)
    const existingMemberIndex = currentTeamMembers.findIndex(m => m.id === teamMember.id);
    const updatedTeamMembers = existingMemberIndex >= 0
      ? currentTeamMembers.map((m, idx) => idx === existingMemberIndex ? teamMember : m)
      : [...currentTeamMembers, teamMember];

    // Update user profile with team member
    const { error: teamUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        team_members: updatedTeamMembers,
        updated_at: now
      })
      .eq('id', userId);

    if (teamUpdateError) {
      console.error('[API] Error updating team members:', teamUpdateError);
      // Don't fail - team member can be added later
    } else {
      console.log('[API] Added user as team member:', teamMember.id);
    }

    // Step 5: Get full organization with membership (refresh to get updated logo_url)
    const { data: fullOrg, error: orgFetchError } = await supabaseAdmin
      .from('organizations')
      .select(`
        *,
        members:org_members!inner(
          *,
          user:user_profiles(*)
        )
      `)
      .eq('id', organizationId)
      .single();

    if (orgFetchError) {
      console.error('[API] Error fetching organization:', orgFetchError);
      // Don't fail - we already created everything
    }

    // Return response in format compatible with existing code
    const profile = userProfile.profile && typeof userProfile.profile === 'object' 
      ? userProfile.profile 
      : {};

    return res.status(200).json({
      userId: userProfile.id,
      email: userProfile.email,
      firstName: userProfile.first_name || '',
      lastName: userProfile.last_name || '',
      purpose: userProfile.purpose,
      role: userProfile.role,
      reportingEmail: profile.reportingEmail || userProfile.email,
      developerMode: profile.developerMode || false,
      organization: {
        id: fullOrg?.id || organizationId,
        name: fullOrg?.name || userData.companyName,
        logo: fullOrg?.logo_url || '', // Logo URL from organization (uploaded to org-specific path)
        industry: fullOrg?.industry || userData.industry || '',
        membership: {
          role: membershipRole,
          createdAt: userAlreadyInOrg ? now : membership?.created_at ?? now,
        },
      },
      teamMembers: updatedTeamMembers, // Include team members in response
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at,
      ...profile,
    });
  } catch (error) {
    console.error('[API] Error in create-user-account-v2:', {
      error,
      message: error.message,
      code: error.code,
      userId: authUserId,
    });
    
    // CRITICAL: Final cleanup attempt BEFORE returning error
    let cleanupSuccess = false;
    if (authUserId && supabaseAdmin) {
      try {
        // Try to delete profile if it exists
        try {
          await supabaseAdmin.from('user_profiles').delete().eq('id', authUserId);
        } catch (profileErr) {
          // Profile might not exist, that's okay
          console.log('[API] Profile cleanup skipped (may not exist):', profileErr.message);
        }
        
        // Delete auth user
        const deleteResult = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        if (!deleteResult.error) {
          cleanupSuccess = true;
          console.log('[API] Final cleanup: Deleted auth user');
        } else {
          console.error('[API] Final cleanup failed:', deleteResult.error);
        }
      } catch (cleanupErr) {
        console.error('[API] Final cleanup exception:', cleanupErr);
      }
    }
    
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Failed to create user account',
      cleanupAttempted: !!authUserId,
      cleanupSuccess
    });
  }
}
