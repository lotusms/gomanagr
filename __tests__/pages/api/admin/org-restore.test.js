/**
 * Unit tests for org-restore API.
 * POST only; 503; 401; 400 missing/invalid backup; 403 not allowed role; 200 schema_only; 200 migration; 500 insert fail.
 */

const mockGetAuthenticatedUserId = jest.fn();
jest.mock('@/lib/apiAuth', () => ({
  getAuthenticatedUserId: (req) => mockGetAuthenticatedUserId(req),
}));

jest.mock('@/config/rolePermissions', () => ({
  isOrgBackupAllowedRole: jest.fn((role) => role === 'superadmin' || role === 'admin' || role === 'developer'),
}));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args) => mockFrom(...args),
    auth: { admin: { inviteUserByEmail: jest.fn() } },
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (c) {
      this.statusCode = c;
      return this;
    }),
    json: jest.fn(function (d) {
      this._json = d;
      return this;
    }),
  };
}

const validBackup = {
  version: 1,
  scope: 'org',
  orgId: 'org-1',
  schemaVersion: '049',
  tables: {
    organizations: [],
    org_members: [],
    org_invites: [],
    user_profiles: [],
    client_proposals: [],
    client_contracts: [],
    client_invoices: [],
    client_projects: [],
    client_attachments: [],
    client_emails: [],
    client_calls: [],
    client_messages: [],
    client_internal_notes: [],
    client_online_resources: [],
    client_meeting_notes: [],
  },
};

describe('org-restore API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('u1');
    mockFrom.mockImplementation((table) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }));
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', backup: validBackup },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 401 when no Bearer token', async () => {
    mockGetAuthenticatedUserId.mockResolvedValueOnce(null);
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', backup: validBackup },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' })
    );
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { backup: validBackup },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId' });
  });

  it('returns 400 when backup missing or invalid', async () => {
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid backup' });
  });

  it('returns 400 when backup orgId does not match organizationId', async () => {
    const backupMismatch = { ...validBackup, orgId: 'other-org' };
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', backup: backupMismatch },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Backup orgId does not match organizationId',
    });
  });

  it('returns 403 when user role cannot restore', async () => {
    const { isOrgBackupAllowedRole } = require('@/config/rolePermissions');
    isOrgBackupAllowedRole.mockReturnValueOnce(false);
    mockFrom.mockImplementation((table) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'member' }, error: null }),
          }),
        }),
      }),
    }));
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', backup: validBackup },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Forbidden',
        message: expect.stringContaining('owner or admin'),
      })
    );
  });

  it('returns 200 with instructions when restoreMode is schema_only', async () => {
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        backup: validBackup,
        restoreMode: 'schema_only',
      },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Schema-only'),
        instructions: expect.any(String),
        schemaVersion: '049',
      })
    );
  });

  it('returns 200 with inserted counts when migration restore succeeds', async () => {
    const handler = (await import('@/pages/api/admin/org-restore')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        backup: validBackup,
        restoreMode: 'migration',
      },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Restore complete'),
        inserted: expect.any(Object),
      })
    );
  });
});
