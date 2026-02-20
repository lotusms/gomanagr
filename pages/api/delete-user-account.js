/**
 * API route to delete user account
 * Uses Supabase Admin API to delete both auth user and database record
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase Admin not configured for user account deletion');
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ 
      error: 'service-unavailable',
      message: 'User account deletion service is temporarily unavailable. Please try again later.'
    });
  }

  const { userId } = req.body;

  if (!userId) {
    console.error('[API] Missing required field: userId');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // Step 1: Delete user account record from database
    console.log('[API] Deleting user account record:', userId);
    const { error: deleteAccountError } = await supabaseAdmin
      .from('user_account')
      .delete()
      .eq('id', userId);

    if (deleteAccountError) {
      console.error('[API] Error deleting user account:', deleteAccountError);
      // Continue even if account deletion fails - auth user deletion is more critical
    } else {
      console.log('[API] User account record deleted successfully');
    }

    // Step 2: Delete auth user (this also handles related data cleanup)
    console.log('[API] Deleting auth user:', userId);
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('[API] Error deleting auth user:', deleteAuthError);
      throw deleteAuthError;
    }

    console.log('[API] User account and auth user deleted successfully:', userId);
    
    return res.status(200).json({ 
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('[API] Error in delete-user-account API:', {
      error,
      message: error.message,
      stack: error.stack,
      userId: req.body?.userId,
    });
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Failed to delete user account'
    });
  }
}
