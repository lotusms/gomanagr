/**
 * Unit tests for master-backup API.
 * POST only; 503; 401; 403 not platform admin; 429 rate limited; 500 upload/sign; 200 with downloadUrl.
 */

const mockGetAuthenticatedUserId = jest.fn();
jest.mock('@/lib/apiAuth', () => ({
  getAuthenticatedUserId: (req) => mockGetAuthenticatedUserId(req),
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

const MASTER_TABLES = [
  'user_profiles', 'organizations', 'org_members', 'org_invites',
  'client_proposals', 'client_contracts', 'client_invoices', 'client_projects',
  'client_attachments', 'client_emails', 'client_calls', 'client_messages',
  'client_internal_notes', 'client_online_resources', 'client_meeting_notes',
];

describe('master-backup API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('u1');
    mockStorageCreateBucket.mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({
      upload: () =>
        Promise.resolve({
          data: { path: 'master/2025-01-01/full.json' },
          error: null,
        }),
      createSignedUrl: () =>
        Promise.resolve({
          data: { signedUrl: 'https://signed.example.com/master-backup.json' },
          error: null,
        }),
    });
    let platformAdminsCalled = false;
    let backupExportsCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'platform_admins') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: platformAdminsCalled ? null : { user_id: 'u1' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'backup_exports') {
        const n = backupExportsCalls++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    limit: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/platform/master-backup')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {}, headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/platform/master-backup')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {}, headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 401 when no Bearer token', async () => {
    mockGetAuthenticatedUserId.mockResolvedValueOnce(null);
    const handler = (await import('@/pages/api/platform/master-backup')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {}, headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' })
    );
  });

  it('returns 403 when user is not platform admin', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'platform_admins') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/platform/master-backup')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {}, headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Only platform operators can run master backup',
    });
  });

  it('returns 429 when rate limited', async () => {
    let backupExportsCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'platform_admins') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { user_id: 'u1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'backup_exports') {
        const n = backupExportsCalls++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    limit: () =>
                      Promise.resolve({ data: [{ id: 'recent-1' }], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    });
    const handler = (await import('@/pages/api/platform/master-backup')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {}, headers: {}, socket: {} }, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Rate limited',
        message: expect.stringContaining('15'),
      })
    );
  });

  it('returns 200 with downloadUrl and filename when backup succeeds', async () => {
    const handler = (await import('@/pages/api/platform/master-backup')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {},
      headers: {},
      socket: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        downloadUrl: expect.any(String),
        filename: expect.stringMatching(/gomanagr-master-backup/),
        expiresIn: 300,
      })
    );
  });
});
