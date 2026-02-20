/**
 * API route to delete auth user (for cleanup when signup fails)
 * Uses Supabase Admin API
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase Admin not configured');
    supabaseAdmin = null;
  } else {
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
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('[API] Error deleting auth user:', error);
      return res.status(500).json({ 
        error: 'Failed to delete user',
        message: error.message 
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[API] Error in delete-auth-user:', error);
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Failed to delete user'
    });
  }
}
