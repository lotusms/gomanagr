/**
 * API route to fix missing user_account rows for existing auth users
 * This can be called manually to create user_account entries for users who
 * have auth accounts but no corresponding user_account row
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, firstName, lastName } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }

  try {
    // Check if user_account already exists
    const { data: existing } = await supabaseAdmin
      .from('user_account')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      // If account exists but firstName/lastName are empty and we have them, update it
      const needsUpdate = (!existing.first_name || !existing.last_name) && (firstName || lastName);
      
      if (needsUpdate) {
        const trimmedFirstName = (firstName || '').trim();
        const trimmedLastName = (lastName || '').trim();
        
        const { error: updateError } = await supabaseAdmin
          .from('user_account')
          .update({
            first_name: trimmedFirstName || existing.first_name,
            last_name: trimmedLastName || existing.last_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating firstName/lastName:', updateError);
          return res.status(500).json({ 
            error: 'Failed to update account',
            details: updateError.message 
          });
        }
        
        return res.status(200).json({ 
          message: 'User account updated with firstName/lastName',
          userId,
          email,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        });
      }
      
      return res.status(200).json({ 
        message: 'User account already exists',
        userId,
        email 
      });
    }

    // Create user_account entry with available data
    const now = new Date().toISOString();
    const trimmedFirstName = (firstName || '').trim();
    const trimmedLastName = (lastName || '').trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim() || email.split('@')[0] || 'Account Owner';
    
    const accountData = {
      id: userId,
      user_id: userId,
      email: email,
      trial: true,
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      profile: {
        reportingEmail: email,
      },
      team_members: [{
        id: `owner-${userId}`,
        name: fullName,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: email,
        role: 'Owner',
        company: '',
        industry: '',
        status: 'active',
        isOwner: true,
        isAdmin: true,
      }],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabaseAdmin
      .from('user_account')
      .insert(accountData)
      .select()
      .single();

    if (error) {
      console.error('Error creating user account:', error);
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: error.message 
      });
    }

    return res.status(200).json({ 
      message: 'User account created successfully',
      userId,
      email,
      accountId: data.id
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
