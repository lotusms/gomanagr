/**
 * Master (full system) backup. Only platform_admins can call this.
 * Exports all tables with no org filter. Do not expose to tenant roles.
 */

import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/lib/apiAuth';

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

const BACKUPS_BUCKET = 'backups';
const SIGNED_URL_EXPIRES_SEC = 300;
const RATE_LIMIT_MINUTES = 15;

const MASTER_TABLES = [
  'user_profiles',
  'organizations',
  'org_members',
  'org_invites',
  'client_proposals',
  'client_contracts',
  'client_invoices',
  'client_projects',
  'client_attachments',
  'client_emails',
  'client_calls',
  'client_messages',
  'client_internal_notes',
  'client_online_resources',
  'client_meeting_notes',
];

async function ensureBackupsBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(BACKUPS_BUCKET, {
    public: false,
  });
  const exists = error && (error.message === 'Bucket already exists' || error.message === 'The resource already exists');
  if (error && !exists) throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authorization: Bearer <token> required' });
  }

  const { data: platformRow } = await supabaseAdmin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!platformRow) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only platform operators can run master backup' });
  }

  const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from('backup_exports')
    .select('id')
    .eq('scope', 'master')
    .eq('user_id', userId)
    .gte('exported_at', since)
    .limit(1);
  if (recent && recent.length > 0) {
    return res.status(429).json({
      error: 'Rate limited',
      message: `One master backup per ${RATE_LIMIT_MINUTES} minutes. Try again later.`,
    });
  }

  try {
    await ensureBackupsBucket();

    const tables = {};
    for (const tableName of MASTER_TABLES) {
      const { data, error } = await supabaseAdmin.from(tableName).select('*');
      if (error) {
        tables[tableName] = { __error: error.message };
        continue;
      }
      tables[tableName] = data ?? [];
    }

    const rowCounts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]));
    const payload = {
      version: 1,
      scope: 'master',
      exportedAt: new Date().toISOString(),
      schemaVersion: '049',
      rowCounts,
      tables,
    };
    const json = JSON.stringify(payload, null, 2);
    const buffer = Buffer.from(json, 'utf8');
    const checksum = createHash('sha256').update(json, 'utf8').digest('hex');
    const dateFolder = new Date().toISOString().slice(0, 10);
    const filePath = `master/${dateFolder}/full.json`;

    const { error: uploadErr } = await supabaseAdmin.storage.from(BACKUPS_BUCKET).upload(filePath, buffer, {
      contentType: 'application/json',
      upsert: true,
    });
    if (uploadErr) {
      console.error('[master-backup] upload', uploadErr);
      return res.status(500).json({ error: 'Failed to write backup file' });
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage.from(BACKUPS_BUCKET).createSignedUrl(filePath, SIGNED_URL_EXPIRES_SEC);
    if (signErr || !signed?.signedUrl) {
      console.error('[master-backup] createSignedUrl', signErr);
      return res.status(500).json({ error: 'Failed to create download link' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await supabaseAdmin.from('backup_exports').insert({
      scope: 'master',
      organization_id: null,
      user_id: userId,
      file_path: filePath,
      row_counts: rowCounts,
      user_agent: userAgent,
      ip_address: ip || undefined,
      checksum,
    });

    const filename = `gomanagr-master-backup-${dateFolder}.json`;
    return res.status(200).json({
      downloadUrl: signed.signedUrl,
      filename,
      expiresIn: SIGNED_URL_EXPIRES_SEC,
    });
  } catch (err) {
    console.error('[master-backup]', err);
    return res.status(500).json({ error: 'Backup failed' });
  }
}
