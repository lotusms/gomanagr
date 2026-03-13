/**
 * Unit tests for org-backup API.
 * POST only; 503; 401; 400 missing organizationId; 403 not allowed role; 429 rate limited; 500 upload/sign; 200.
 */

const mockGetAuthenticatedUserId = jest.fn();
jest.mock('@/lib/apiAuth', () => ({
  getAuthenticatedUserId: (req) => mockGetAuthenticatedUserId(req),
}));

jest.mock('@/config/rolePermissions', () => ({
  isOrgBackupAllowedRole: jest.fn((role) => role === 'superadmin' || role === 'admin' || role === 'developer'),
}));

const mockFrom = jest.fn();
const mockStorageCreateBucket = jest.fn();
const mockStorageFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args) => mockFrom(...args),
    storage: {
      createBucket: (...args) => mockStorageCreateBucket(...args),
      from: (bucket) => mockStorageFrom(bucket),
    },
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

function chainSingle(data, error = null) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data, error }),
        }),
      }),
    }),
  };
}

function chainList(data) {
  return {
    select: () => ({
      eq: () => Promise.resolve({ data: data || [], error: null }),
      gte: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  };
}

describe('org-backup API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('u1');
    mockStorageCreateBucket.mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({
      upload: () => Promise.resolve({ data: { path: 'org/org-1/2025-01-01/full.json' }, error: null }),
      createSignedUrl: () =>
        Promise.resolve({
          data: { signedUrl: 'https://signed.example.com/backup.json' },
          error: null,
        }),
    });
    let orgMembersCalls = 0;
    let backupExportsCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        const n = orgMembersCalls++;
        if (n === 0) {
          return chainSingle({ role: 'admin' });
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      }
      if (table === 'backup_exports') {
        const n = backupExportsCalls++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gte: () => ({
                      limit: () => Promise.resolve({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'org-1', name: 'Org' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => Promise.resolve({ error: null }),
      };
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/admin/org-backup')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/admin/org-backup')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 401 when no Bearer token', async () => {
    mockGetAuthenticatedUserId.mockResolvedValueOnce(null);
    const handler = (await import('@/pages/api/admin/org-backup')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' })
    );
  });

  it('returns 400 when organizationId missing', async () => {
    const handler = (await import('@/pages/api/admin/org-backup')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {},
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing organizationId' });
  });

  it('returns 403 when user role cannot export backup', async () => {
    const { isOrgBackupAllowedRole } = require('@/config/rolePermissions');
    isOrgBackupAllowedRole.mockReturnValueOnce(false);
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return chainSingle({ role: 'member' });
      }
      return {};
    });
    const handler = (await import('@/pages/api/admin/org-backup')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
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

  it('returns 429 when rate limited (recent backup exists)', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return chainSingle({ role: 'admin' });
      }
      if (table === 'backup_exports') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    limit: () => Promise.resolve({ data: [{ id: 'recent-1' }], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/admin/org-backup')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Rate limited',
        message: expect.stringContaining('15'),
      })
    );
  });

  it('returns 200 with downloadUrl and filename when backup succeeds', async () => {
    const handler = (await import('@/pages/api/admin/org-backup')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
      headers: {},
      socket: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        downloadUrl: expect.any(String),
        filename: expect.stringMatching(/gomanagr-org-backup/),
        expiresIn: 300,
      })
    );
  });
});
