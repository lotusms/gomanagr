/**
 * Upload a file to Supabase storage for client attachments (e.g. email attachments).
 * POST body: { userId, clientId, filename, contentType, base64 }
 * Returns: { url }
 * Creates the "client-attachments" bucket automatically if it does not exist.
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  supabaseAdmin = null;
}

const BUCKET = 'client-attachments';

async function ensureBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
  });
  const alreadyExists =
    error && (error.message === 'Bucket already exists' || error.message === 'The resource already exists');
  if (error && !alreadyExists) {
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, clientId, filename, contentType, base64 } = req.body || {};
  if (!userId || !clientId || !filename || !base64) {
    return res.status(400).json({ error: 'Missing userId, clientId, filename, or base64' });
  }

  try {
    await ensureBucket();

    const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const path = `${userId}/${clientId}/${unique}-${safeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('[upload-client-attachment]', error);
      return res.status(500).json({ error: error.message || 'Upload failed' });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('[upload-client-attachment]', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
