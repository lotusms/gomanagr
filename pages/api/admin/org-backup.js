/**
 * Org-scoped backup. Only org owner or admin can export.
 * Server derives userId from Bearer token; client sends only organizationId (validated against membership).
 * All queries are explicitly scoped by organization_id to prevent tenant leakage.
 */

import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/lib/apiAuth';
import { isOrgBackupAllowedRole } from '@/config/rolePermissions';
import { RESTORE_TABLE_ORDER } from '@/lib/backupRestore';

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

  const { organizationId, backupType = 'full' } = req.body || {};
  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId' });
  }
  const schemaOnly = backupType === 'schema_only';

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (memErr || !membership || !isOrgBackupAllowedRole(membership.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only organization owner or admin can export backup' });
    }

    const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('backup_exports')
      .select('id')
      .eq('scope', 'org')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .gte('exported_at', since)
      .limit(1);
    if (recent && recent.length > 0) {
      return res.status(429).json({
        error: 'Rate limited',
        message: `One backup per ${RATE_LIMIT_MINUTES} minutes per organization. Try again later.`,
      });
    }

    await ensureBackupsBucket();

    let tables;
    let rowCounts;

    if (schemaOnly) {
      tables = Object.fromEntries(RESTORE_TABLE_ORDER.map((name) => [name, []]));
      rowCounts = Object.fromEntries(RESTORE_TABLE_ORDER.map((name) => [name, 0]));
    } else {
      const orgRow = await supabaseAdmin.from('organizations').select('*').eq('id', organizationId).single();
      const orgMembers = await supabaseAdmin.from('org_members').select('*').eq('organization_id', organizationId);
      const orgInvites = await supabaseAdmin.from('org_invites').select('*').eq('organization_id', organizationId);

      const memberUserIds = (orgMembers.data || []).map((m) => m.user_id).filter(Boolean);
      let userProfiles = [];
      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabaseAdmin.from('user_profiles').select('*').in('id', memberUserIds);
        userProfiles = profiles || [];
      }

      const clientTables = [
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
      tables = {
        organizations: orgRow.data ? [orgRow.data] : [],
        org_members: orgMembers.data || [],
        org_invites: orgInvites.data || [],
        user_profiles: userProfiles,
      };
      for (const tableName of clientTables) {
        const { data } = await supabaseAdmin.from(tableName).select('*').eq('organization_id', organizationId);
        tables[tableName] = data ?? [];
      }
      rowCounts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
    }

    const payload = {
      version: 1,
      scope: 'org',
      orgId: organizationId,
      exportedAt: new Date().toISOString(),
      schemaVersion: '049',
      backupType: schemaOnly ? 'schema_only' : 'full',
      rowCounts: rowCounts || Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
      tables,
    };
    const json = JSON.stringify(payload, null, 2);
    const buffer = Buffer.from(json, 'utf8');
    const checksum = createHash('sha256').update(json, 'utf8').digest('hex');
    const dateFolder = new Date().toISOString().slice(0, 10);
    const filePath = `org/${organizationId}/${dateFolder}/full.json`;

    const { error: uploadErr } = await supabaseAdmin.storage.from(BACKUPS_BUCKET).upload(filePath, buffer, {
      contentType: 'application/json',
      upsert: true,
    });
    if (uploadErr) {
      console.error('[org-backup] upload', uploadErr);
      return res.status(500).json({ error: 'Failed to write backup file' });
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage.from(BACKUPS_BUCKET).createSignedUrl(filePath, SIGNED_URL_EXPIRES_SEC);
    if (signErr || !signed?.signedUrl) {
      console.error('[org-backup] createSignedUrl', signErr);
      return res.status(500).json({ error: 'Failed to create download link' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await supabaseAdmin.from('backup_exports').insert({
      scope: 'org',
      organization_id: organizationId,
      user_id: userId,
      file_path: filePath,
      row_counts: rowCounts,
      user_agent: userAgent,
      ip_address: ip || undefined,
      checksum,
    });

    const filename = schemaOnly
      ? `gomanagr-org-backup-schema-only-${dateFolder}.json`
      : `gomanagr-org-backup-${dateFolder}.json`;
    return res.status(200).json({
      downloadUrl: signed.signedUrl,
      filename,
      expiresIn: SIGNED_URL_EXPIRES_SEC,
    });
  } catch (err) {
    console.error('[org-backup]', err);
    return res.status(500).json({ error: 'Backup failed' });
  }
}
