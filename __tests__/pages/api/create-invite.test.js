/**
 * Unit tests for create-invite API:
 * - POST only; 405 for other methods
 * - 503 when Supabase unavailable
 * - 400 missing organizationId, email, or invitedByUserId
 * - 400 invalid role
 * - 403 when inviter not admin/developer/superadmin
 * - 500 when insert fails
 * - 200 and returns invite + inviteLink when success
 * - inviteeData included when provided; email normalized to lowercase
 */

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (data) {
      this._json = data;
      return this;
    }),
  };
}

describe('create-invite API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { role: 'admin' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          insert: (row) => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'inv-1',
                    organization_id: row.organization_id,
                    email: row.email,
                    token: row.token,
                    role: row.role,
                    invited_by: row.invited_by,
                    expires_at: row.expires_at,
                    used: false,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', email: 'u@example.com', invitedByUserId: 'u1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when required fields missing', async () => {
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });

    await handler({
      method: 'POST',
      body: { organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', email: 'u@example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when role is invalid', async () => {
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'u@example.com',
        invitedByUserId: 'u1',
        role: 'owner',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
  });

  it('returns 403 when inviter is not admin/developer/superadmin', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { role: 'member' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'u@example.com',
        invitedByUserId: 'u1',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Only admins and developers can create invites',
    });
  });

  it('returns 403 when membership not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'u@example.com',
        invitedByUserId: 'u1',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 500 when insert fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'insert failed' },
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'u@example.com',
        invitedByUserId: 'u1',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'server-error',
        message: expect.any(String),
      })
    );
  });

  it('returns 200 with invite and inviteLink when success', async () => {
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'user@example.com',
        invitedByUserId: 'u1',
        role: 'member',
      },
      headers: { host: 'app.example.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const json = res.json.mock.calls[0][0];
    expect(json).toHaveProperty('inviteLink');
    expect(json.inviteLink).toMatch(/\/accept-invite\?invite=/);
    expect(json.email).toBe('user@example.com');
    expect(json.role).toBe('member');
    expect(json.organization_id).toBe('org-1');
  });

  it('normalizes email to lowercase', async () => {
    let insertedRow = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...row, id: 'inv-1' },
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: '  User@Example.COM  ',
        invitedByUserId: 'u1',
      },
      headers: {},
    }, res);
    expect(insertedRow.email).toBe('user@example.com');
  });

  it('includes invitee_data when inviteeData object provided', async () => {
    let insertedRow = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'developer' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...row, id: 'inv-1' },
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'u@example.com',
        invitedByUserId: 'u1',
        role: 'admin',
        inviteeData: { name: 'Jane', title: 'Designer' },
      },
      headers: {},
    }, res);
    expect(insertedRow.invitee_data).toEqual({ name: 'Jane', title: 'Designer' });
  });

  it('uses x-forwarded-host and x-forwarded-proto for inviteLink when present', async () => {
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'u@example.com',
        invitedByUserId: 'u1',
      },
      headers: {
        'x-forwarded-host': 'app.example.com',
        'x-forwarded-proto': 'https',
      },
    }, res);
    const json = res.json.mock.calls[0][0];
    expect(json.inviteLink).toMatch(/^https:\/\/app\.example\.com\/accept-invite/);
  });

  it('accepts expiresInDays and sets expires_at accordingly', async () => {
    let insertedRow = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          insert: (row) => {
            insertedRow = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...row, id: 'inv-1' },
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-invite')).default;
    const res = mockRes();
    const now = new Date();
    await handler({
      method: 'POST',
      body: {
        organizationId: 'org-1',
        email: 'u@example.com',
        invitedByUserId: 'u1',
        expiresInDays: 14,
      },
      headers: {},
    }, res);
    expect(insertedRow.expires_at).toBeDefined();
    const expiresAt = new Date(insertedRow.expires_at);
    const diffDays = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(14);
  });
});
