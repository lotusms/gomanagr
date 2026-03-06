/**
 * Backup/restore table order and helpers.
 * Used by org-backup (export) and org-restore (import).
 */

/** Insert order for restore: parent tables first, then FKs. */
export const RESTORE_TABLE_ORDER = [
  'organizations',
  'org_members',
  'org_invites',
  'user_profiles',
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

/** Tables that contain user_id (FK to user_profiles.id). Used when remapping auth user IDs after disaster restore. */
export const TABLES_WITH_USER_ID = [
  'org_members',       // user_id
  'org_invites',       // invited_by
  'user_profiles',     // id (PK)
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

/** For org_invites the FK column is invited_by, not user_id. */
export const USER_ID_COLUMN_BY_TABLE = {
  org_members: 'user_id',
  org_invites: 'invited_by',
  user_profiles: 'id',
  client_proposals: 'user_id',
  client_contracts: 'user_id',
  client_invoices: 'user_id',
  client_projects: 'user_id',
  client_attachments: 'user_id',
  client_emails: 'user_id',
  client_calls: 'user_id',
  client_messages: 'user_id',
  client_internal_notes: 'user_id',
  client_online_resources: 'user_id',
  client_meeting_notes: 'user_id',
};

const MIN_SCHEMA_VERSION = '001';

/**
 * Validate backup JSON shape and scope.
 * @param {object} payload - Parsed backup JSON
 * @param {'org'|'master'} [requiredScope] - If set, scope must match
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBackupPayload(payload, requiredScope) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid backup: not an object' };
  }
  if (payload.version !== 1) {
    return { valid: false, error: 'Unsupported backup version' };
  }
  if (payload.scope !== 'org' && payload.scope !== 'master') {
    return { valid: false, error: 'Invalid backup scope' };
  }
  if (requiredScope && payload.scope !== requiredScope) {
    return { valid: false, error: `Backup scope must be ${requiredScope}` };
  }
  if (!payload.tables || typeof payload.tables !== 'object') {
    return { valid: false, error: 'Missing or invalid tables' };
  }
  const schemaVersion = String(payload.schemaVersion || '').trim();
  if (!schemaVersion) {
    return { valid: false, error: 'Missing schemaVersion' };
  }
  return { valid: true };
}

/**
 * Get tables present in backup in restore order (only those that exist in payload).
 * @param {object} tables - payload.tables
 * @returns {string[]}
 */
export function getOrderedTableNames(tables) {
  return RESTORE_TABLE_ORDER.filter((name) => Array.isArray(tables[name]));
}
