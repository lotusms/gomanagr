/**
 * API route to upload organization logo to organization-specific storage path
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

  const { organizationId, logoData, isAltLogo } = req.body;

  if (!organizationId || !logoData || !logoData.base64) {
    return res.status(400).json({ error: 'Missing organizationId or logoData' });
  }

  const useAltLogo = !!isAltLogo;

  try {
    const base64Data = logoData.base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = logoData.filename || `logo-${Date.now()}.png`;
    const subdir = useAltLogo ? 'alt-logo' : 'logo';
    const logoPath = `${organizationId}/${subdir}/${filename}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('company-logos')
      .upload(logoPath, buffer, {
        contentType: logoData.contentType || 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('[API] Error uploading logo:', uploadError);
      return res.status(500).json({ error: 'Failed to upload logo', details: uploadError.message });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('company-logos')
      .getPublicUrl(uploadData.path);
    
    const updatePayload = useAltLogo
      ? { alt_logo_url: urlData.publicUrl, updated_at: new Date().toISOString() }
      : { logo_url: urlData.publicUrl, updated_at: new Date().toISOString() };

    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update(updatePayload)
      .eq('id', organizationId);
    
    if (updateError) {
      console.error('[API] Error updating organization logo:', updateError);
      return res.status(500).json({ error: 'Failed to update organization', details: updateError.message });
    }
    
    return res.status(200).json({ 
      success: true,
      logoUrl: urlData.publicUrl,
      logoPath,
      ...(useAltLogo ? { altLogoUrl: urlData.publicUrl } : {}),
    });
  } catch (error) {
    console.error('[API] Error in upload-organization-logo:', error);
    return res.status(500).json({ 
      error: 'server-error',
      message: error.message || 'Failed to upload logo'
    });
  }
}
