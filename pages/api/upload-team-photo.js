/**
 * API route to upload team member photo to user-specific storage path
 * Uses service role to bypass RLS
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

  const { userId, memberId, photoData } = req.body;

  if (!userId || !memberId || !photoData || !photoData.base64) {
    return res.status(400).json({ error: 'Missing userId, memberId, or photoData' });
  }

  try {
    // Convert base64 to buffer
    const base64Data = photoData.base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Use user ID and member ID in the path: {userId}/{memberId}/{filename}
    const filename = photoData.filename || `photo-${Date.now()}.png`;
    const photoPath = `${userId}/${memberId}/${filename}`;
    
    // Upload to storage bucket using service role
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('team-photos')
      .upload(photoPath, buffer, {
        contentType: photoData.contentType || 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('[API] Error uploading team photo:', uploadError);
      return res.status(500).json({ error: 'Failed to upload team photo', details: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('team-photos')
      .getPublicUrl(uploadData.path);
    
    return res.status(200).json({ 
      success: true,
      photoUrl: urlData.publicUrl,
      photoPath 
    });
  } catch (error) {
    console.error('[API] Error in upload-team-photo:', error);
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Failed to upload team photo'
    });
  }
}
