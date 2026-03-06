/**
 * Org-scoped restore from backup JSON.
 * POST body: { organizationId, backup: <full backup object>, restoreMode: 'disaster' | 'migration' | 'schema_only' }
 * - disaster: Restore data then create auth users and send invite (set password) to each; remap user IDs.
 * - migration: Restore data only. Auth is assumed migrated separately (same credentials).
 * - schema_only: No insert; return instructions for blank/whitelabel (run migrations on new project).
 */

import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/lib/apiAuth';
import { isOrgBackupAllowedRole } from '@/config/rolePermissions';
import {
  validateBackupPayload,
  getOrderedTableNames,
  RESTORE_TABLE_ORDER,
  USER_ID_COLUMN_BY_TABLE,
} from '@/lib/backupRestore';

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

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization: Bearer <token> required',
    });
  }

  const { organizationId, backup, restoreMode = 'migration' } = req.body || {};
  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organizationId' });
  }
  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid backup' });
  }
  const mode = ['disaster', 'migration', 'schema_only'].includes(restoreMode)
    ? restoreMode
    : 'migration';

  const validation = validateBackupPayload(backup, 'org');
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  if (backup.orgId && backup.orgId !== organizationId) {
    return res.status(400).json({ error: 'Backup orgId does not match organizationId' });
  }

  try {
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (memErr || !membership || !isOrgBackupAllowedRole(membership.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only organization owner or admin can restore backup',
      });
    }

    if (mode === 'schema_only') {
      return res.status(200).json({
        message: 'Schema-only restore: no data to insert.',
        instructions:
          'For a blank copy (whitelabel), run your Supabase migrations on the new project. Use the same migration files from this codebase. No backup file is needed for structure-only setup.',
        schemaVersion: backup.schemaVersion,
      });
    }

    const tables = backup.tables;
    const orderedNames = getOrderedTableNames(tables);
    if (orderedNames.length === 0) {
      return res.status(400).json({ error: 'Backup contains no tables' });
    }

    const inserted = {};
    for (const tableName of orderedNames) {
      const rows = tables[tableName];
      if (!Array.isArray(rows) || rows.length === 0) {
        inserted[tableName] = 0;
        continue;
      }
      const { error: insertErr } = await supabaseAdmin.from(tableName).insert(rows);
      if (insertErr) {
        console.error('[org-restore] insert', tableName, insertErr);
        return res.status(500).json({
          error: 'Restore failed',
          message: `Insert into ${tableName} failed: ${insertErr.message}`,
          inserted,
        });
      }
      inserted[tableName] = rows.length;
    }

    let invitesSent = 0;
    let inviteErrors = [];

    if (mode === 'disaster') {
      const profiles = tables.user_profiles || [];
      const redirectTo = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/reset-password`
        : undefined;

      for (const row of profiles) {
        const email = row.email || row.user_id;
        if (!email || typeof email !== 'string') continue;
        const oldId = row.id;

        const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          email.trim(),
          { redirectTo }
        );

        if (inviteErr) {
          inviteErrors.push({ email: email.trim(), error: inviteErr.message });
          continue;
        }
        const newId = inviteData?.user?.id;
        if (!newId || newId === oldId) {
          invitesSent += 1;
          continue;
        }

        for (const [tbl, col] of Object.entries(USER_ID_COLUMN_BY_TABLE)) {
          if (tbl === 'user_profiles') continue;
          const { error: upErr } = await supabaseAdmin
            .from(tbl)
            .update({ [col]: newId })
            .eq(col, oldId);
          if (upErr) {
            console.error('[org-restore] update', tbl, col, upErr);
          }
        }

        const { error: delErr } = await supabaseAdmin.from('user_profiles').delete().eq('id', oldId);
        if (delErr) {
          console.error('[org-restore] delete old profile', delErr);
        }
        const { error: insErr } = await supabaseAdmin.from('user_profiles').insert([{ ...row, id: newId }]);
        if (insErr) {
          console.error('[org-restore] insert new profile', insErr);
        }
        invitesSent += 1;
      }

      return res.status(200).json({
        message: 'Restore complete. Auth invites sent so users can set a new password.',
        inserted,
        invitesSent,
        inviteErrors: inviteErrors.length ? inviteErrors : undefined,
      });
    }

    return res.status(200).json({
      message: 'Restore complete. No auth changes (migration mode).',
      inserted,
    });
  } catch (err) {
    console.error('[org-restore]', err);
    return res.status(500).json({ error: 'Restore failed' });
  }
}
