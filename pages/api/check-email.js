/**
 * API route to check if email exists in Firebase Auth
 * Uses Firebase Admin SDK for reliable checking
 */

import { adminAuth } from '@/server/lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Use Firebase Admin SDK to check if user exists by email
    let exists = false;
    let methods = [];
    let foundUser = null;
    
    try {
      // Admin SDK can get user by email
      foundUser = await adminAuth.getUserByEmail(email);
      exists = true;
      methods = foundUser.providerData.map(provider => provider.providerId);
      
    } catch (adminError) {
      // If user doesn't exist, Admin SDK throws an error
      if (adminError.code === 'auth/user-not-found') {
        exists = false;
        methods = [];
      } else {
        // Other errors (permission, network, etc.)
        console.error('❌ [API] Admin SDK error:', adminError);
        return res.status(500).json({ 
          error: 'Unable to verify email',
          message: adminError.message || 'Unknown error'
        });
      }
    }
    
    return res.status(200).json({ 
      exists,
      methods: methods
    });

  } catch (error) {
    console.error('Email check error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
}
