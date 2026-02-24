/**
 * API route to check if email exists in Supabase Auth
 * Uses Supabase Admin API for reliable checking
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase Admin not configured. Email checking will be limited.');
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

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ 
      error: 'service-unavailable',
      message: 'Email verification service is temporarily unavailable. Please try again later.'
    });
  }

  try {
    try {
      const { data: accountData, error: accountError } = await supabaseAdmin
        .from('user_account')
        .select('email')
        .eq('email', email.toLowerCase())
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error if not found
      
      if (accountData && !accountError) {
        return res.status(200).json({ 
          exists: true,
          methods: []
        });
      }
    } catch (dbError) {
      console.warn('Database check failed, continuing with auth check:', dbError);
    }
    
    const emailLower = email.toLowerCase();
    let foundUser = null;
    let page = 1;
    const perPage = 10;
    const maxPages = 3; // Limit to 3 pages to avoid rate limits
    
    while (page <= maxPages && !foundUser) {
      try {
        const { data: usersData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        
        if (authError) {
          if (authError.status === 429 || authError.message?.toLowerCase().includes('rate limit')) {
            console.warn('[API] Rate limit hit during email check');
            return res.status(200).json({ 
              exists: false,
              methods: [],
              error: 'quota-exceeded',
              message: 'Email check temporarily unavailable. You can proceed with signup.'
            });
          }
          
          console.error('[API] Error checking email in auth:', authError);
          return res.status(200).json({ 
            exists: false,
            methods: [],
            error: 'server-error',
            message: 'Email verification unavailable. You can proceed with signup.'
          });
        }
        
        foundUser = usersData?.users?.find(user => 
          user.email?.toLowerCase() === emailLower
        );
        
        if (foundUser) {
          break;
        }
        
        if (!usersData?.users || usersData.users.length < perPage) {
          break;
        }
        
        page++;
      } catch (pageError) {
        console.error('[API] Exception during auth email check (page ' + page + '):', pageError);
        break;
      }
    }
    
    if (foundUser) {
      const methods = foundUser.app_metadata?.providers || [];
      return res.status(200).json({ 
        exists: true,
        methods: methods
      });
    }
    
    return res.status(200).json({ 
      exists: false,
      methods: []
    });

  } catch (error) {
    console.error('Email check error:', error);
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Unknown error occurred'
    });
  }
}
