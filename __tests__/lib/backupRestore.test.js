/**
 * Unit tests for lib/backupRestore.js: RESTORE_TABLE_ORDER, TABLES_WITH_USER_ID, USER_ID_COLUMN_BY_TABLE, validateBackupPayload, getOrderedTableNames
 */
import {
  RESTORE_TABLE_ORDER,
  TABLES_WITH_USER_ID,
  USER_ID_COLUMN_BY_TABLE,
  validateBackupPayload,
  getOrderedTableNames,
} from '@/lib/backupRestore';

describe('backupRestore', () => {
  describe('constants', () => {
    it('RESTORE_TABLE_ORDER lists tables in dependency order', () => {
      expect(RESTORE_TABLE_ORDER).toContain('organizations');
      expect(RESTORE_TABLE_ORDER).toContain('org_members');
      expect(RESTORE_TABLE_ORDER).toContain('user_profiles');
      expect(RESTORE_TABLE_ORDER[0]).toBe('organizations');
      expect(RESTORE_TABLE_ORDER.length).toBeGreaterThanOrEqual(14);
    });

    it('TABLES_WITH_USER_ID includes org_members and user_profiles', () => {
      expect(TABLES_WITH_USER_ID).toContain('org_members');
      expect(TABLES_WITH_USER_ID).toContain('user_profiles');
      expect(TABLES_WITH_USER_ID).toContain('client_invoices');
    });

    it('USER_ID_COLUMN_BY_TABLE maps org_invites to invited_by', () => {
      expect(USER_ID_COLUMN_BY_TABLE.org_invites).toBe('invited_by');
      expect(USER_ID_COLUMN_BY_TABLE.org_members).toBe('user_id');
      expect(USER_ID_COLUMN_BY_TABLE.user_profiles).toBe('id');
    });
  });

  describe('validateBackupPayload', () => {
    it('returns invalid when payload is null', () => {
      expect(validateBackupPayload(null)).toEqual({ valid: false, error: 'Invalid backup: not an object' });
    });

    it('returns invalid when payload is not an object', () => {
      expect(validateBackupPayload(42)).toEqual({ valid: false, error: 'Invalid backup: not an object' });
      expect(validateBackupPayload('{}')).toEqual({ valid: false, error: 'Invalid backup: not an object' });
    });

    it('returns invalid when version is not 1', () => {
      expect(validateBackupPayload({ version: 2, scope: 'org', tables: {}, schemaVersion: '001' }))
        .toEqual({ valid: false, error: 'Unsupported backup version' });
      expect(validateBackupPayload({ version: 0, scope: 'org', tables: {}, schemaVersion: '001' }))
        .toEqual({ valid: false, error: 'Unsupported backup version' });
    });

    it('returns invalid when scope is not org or master', () => {
      expect(validateBackupPayload({ version: 1, scope: 'other', tables: {}, schemaVersion: '001' }))
        .toEqual({ valid: false, error: 'Invalid backup scope' });
    });

    it('returns valid for scope org', () => {
      expect(validateBackupPayload({ version: 1, scope: 'org', tables: {}, schemaVersion: '001' }))
        .toEqual({ valid: true });
    });

    it('returns valid for scope master', () => {
      expect(validateBackupPayload({ version: 1, scope: 'master', tables: {}, schemaVersion: '001' }))
        .toEqual({ valid: true });
    });

    it('returns invalid when requiredScope is set and does not match', () => {
      expect(validateBackupPayload(
        { version: 1, scope: 'org', tables: {}, schemaVersion: '001' },
        'master'
      )).toEqual({ valid: false, error: 'Backup scope must be master' });
      expect(validateBackupPayload(
        { version: 1, scope: 'master', tables: {}, schemaVersion: '001' },
        'org'
      )).toEqual({ valid: false, error: 'Backup scope must be org' });
    });

    it('returns valid when requiredScope matches', () => {
      expect(validateBackupPayload(
        { version: 1, scope: 'org', tables: {}, schemaVersion: '001' },
        'org'
      )).toEqual({ valid: true });
    });

    it('returns invalid when tables is missing or not an object', () => {
      expect(validateBackupPayload({ version: 1, scope: 'org', schemaVersion: '001' }))
        .toEqual({ valid: false, error: 'Missing or invalid tables' });
      expect(validateBackupPayload({ version: 1, scope: 'org', tables: null, schemaVersion: '001' }))
        .toEqual({ valid: false, error: 'Missing or invalid tables' });
    });

    it('returns invalid when schemaVersion is missing or empty', () => {
      expect(validateBackupPayload({ version: 1, scope: 'org', tables: {} }))
        .toEqual({ valid: false, error: 'Missing schemaVersion' });
      expect(validateBackupPayload({ version: 1, scope: 'org', tables: {}, schemaVersion: '   ' }))
        .toEqual({ valid: false, error: 'Missing schemaVersion' });
    });

    it('returns valid for minimal valid payload', () => {
      expect(validateBackupPayload({
        version: 1,
        scope: 'org',
        tables: {},
        schemaVersion: '001',
      })).toEqual({ valid: true });
    });
  });

  describe('getOrderedTableNames', () => {
    it('returns only tables present in payload in RESTORE_TABLE_ORDER order', () => {
      const tables = {
        client_invoices: [],
        organizations: [],
        user_profiles: [],
      };
      expect(getOrderedTableNames(tables)).toEqual(['organizations', 'user_profiles', 'client_invoices']);
    });

    it('returns empty array when tables has no matching keys', () => {
      expect(getOrderedTableNames({})).toEqual([]);
      expect(getOrderedTableNames({ other: [] })).toEqual([]);
    });

    it('ignores non-array table values', () => {
      const tables = {
        organizations: [],
        org_members: { not: 'array' },
      };
      expect(getOrderedTableNames(tables)).toEqual(['organizations']);
    });

    it('returns full order when all tables present', () => {
      const tables = {};
      RESTORE_TABLE_ORDER.forEach((name) => { tables[name] = []; });
      expect(getOrderedTableNames(tables)).toEqual(RESTORE_TABLE_ORDER);
    });
  });
});
