/**
 * Unit tests for create-user-account-v2 API (key entry and validation paths).
 * - POST only; 405 else
 * - 503 when Supabase unavailable or service key invalid (not eyJ)
 * - 400 missing userId or userData
 * - 401 when no valid session and no valid invite
 * - 403 when authenticated user does not match body userId
 * - 200 when profile created/updated (mocked success path)
 */

const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();
const mockGetUserById = jest.fn();
const mockStorageFrom = jest.fn();

const mockCreateClient = jest.fn((url, key) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (key === anonKey) {
    return {
      auth: { getUser: mockAuthGetUser },
    };
  }
  return {
    from: mockFrom,
    storage: {
      from: (bucket) => mockStorageFrom(bucket),
    },
    auth: {
      admin: {
        getUserById: mockGetUserById,
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  };
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
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

const defaultUserProfileRow = {
  id: 'u1',
  email: 'user@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  profile: {},
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('create-user-account-v2 API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetUserById.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
      error: null,
    });
    mockStorageFrom.mockReturnValue({
      upload: () => Promise.resolve({ data: { path: 'org-1/logo/logo.png' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/logo.png' } }),
    });
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const selectChain = {
          limit: () => Promise.resolve({ data: [], error: null }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        };
        return {
          select: () => selectChain,
          insert: () => ({
            select: () =>
              Promise.resolve({
                data: [defaultUserProfileRow],
                error: null,
              }),
          }),
          update: () => ({
            eq: () => ({
              select: () => Promise.resolve({ data: [defaultUserProfileRow], error: null }),
            }),
          }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase admin not configured', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'u@example.com' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'service-unavailable',
        message: expect.any(String),
      })
    );
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    jest.resetModules();
  });

  it('returns 503 when service key does not start with eyJ', async () => {
    const orig = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sk_not_jwt';
    jest.resetModules();
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'u@example.com' } },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'service-unavailable',
        message: expect.stringContaining('Service role key'),
      })
    );
    process.env.SUPABASE_SERVICE_ROLE_KEY = orig;
    jest.resetModules();
  });

  it('returns 400 when userId or userData missing', async () => {
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or userData' });
  });

  it('returns 401 when no valid session and no invite', async () => {
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'user@example.com' } },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
        message: expect.stringContaining('Valid session or valid invite'),
      })
    );
  });

  it('returns 403 when Bearer user does not match body userId', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'other-user' } },
      error: null,
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'user@example.com' } },
      headers: { authorization: 'Bearer valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Forbidden',
        message: expect.stringContaining('only update your own account'),
      })
    );
  });

  it('returns 200 with user and organization when Bearer matches and new profile created', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    let userProfilesCalls = 0;
    let orgMembersCalls = 0;
    let organizationsCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        if (n === 2) {
          return {
            insert: () => ({
              select: () =>
                Promise.resolve({
                  data: [defaultUserProfileRow],
                  error: null,
                }),
            }),
          };
        }
        return {
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { organization_id: 'org-1', created_at: '2025-01-01T00:00:00Z' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        const n = organizationsCalls++;
        if (n === 0) {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'org-1', name: 'My Organization', logo_url: '' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: 'org-1', name: 'My Organization', logo_url: '' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        userData: { email: 'user@example.com', firstName: 'Jane', lastName: 'Doe' },
      },
      headers: { authorization: 'Bearer valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        email: 'user@example.com',
        organization: expect.objectContaining({
          id: 'org-1',
          membership: expect.objectContaining({ role: 'superadmin' }),
        }),
      })
    );
  });

  it('returns 400 when invite token is invalid (authenticated but invite lookup fails)', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    let userProfilesCalls = 0;
    let orgInvitesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          insert: () => ({
            select: () =>
              Promise.resolve({ data: [defaultUserProfileRow], error: null }),
          }),
        };
      }
      if (table === 'org_invites') {
        const n = orgInvitesCalls++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({ data: null, error: { message: 'not found' } }),
                }),
              }),
            }),
          };
        }
        return {};
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        userData: { email: 'user@example.com' },
        inviteToken: 'bad-token',
      },
      headers: { authorization: 'Bearer token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired invite token' });
  });

  it('returns 500 when profile check fails', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: null, error: { message: 'db error' } }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'user@example.com' } },
      headers: { authorization: 'Bearer token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'profile-check-failed',
        message: expect.any(String),
      })
    );
  });

  it('returns 500 when profile insert fails and attempts cleanup', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    let userProfilesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          insert: () => ({
            select: () =>
              Promise.resolve({ data: null, error: { message: 'insert failed', code: 'ERR' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'user@example.com' } },
      headers: { authorization: 'Bearer token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'profile-creation-failed',
        cleanupAttempted: true,
      })
    );
  });

  it('returns 200 when profile already exists (update path)', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const existingRow = { ...defaultUserProfileRow, team_members: [] };
    let userProfilesCalls = 0;
    let organizationsCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'u1' }, error: null }),
              }),
            }),
          };
        }
        if (n === 2) {
          return {
            update: () => ({
              eq: () => ({
                select: () => Promise.resolve({ data: [existingRow], error: null }),
              }),
            }),
          };
        }
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { organization_id: 'org-1', created_at: '2025-01-01T00:00:00Z' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        const n = organizationsCalls++;
        if (n === 0) {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'org-1', name: 'My Organization', logo_url: '' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: 'org-1', name: 'My Organization', logo_url: '' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        userData: { email: 'user@example.com', firstName: 'Jane', lastName: 'Doe' },
      },
      headers: { authorization: 'Bearer token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        email: 'user@example.com',
        organization: expect.objectContaining({ id: 'org-1' }),
      })
    );
  });

  it('returns 400 when invite token has expired', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    let userProfilesCalls = 0;
    let orgInvitesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          insert: () => ({
            select: () =>
              Promise.resolve({ data: [defaultUserProfileRow], error: null }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      organization_id: 'org-1',
                      role: 'member',
                      email: 'user@example.com',
                      expires_at: new Date(Date.now() - 86400000).toISOString(),
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        userData: { email: 'user@example.com' },
        inviteToken: 'expired-token',
      },
      headers: { authorization: 'Bearer token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invite token has expired' });
  });

  it('returns 400 when invite email does not match signup email', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    let userProfilesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          insert: () => ({
            select: () =>
              Promise.resolve({ data: [defaultUserProfileRow], error: null }),
          }),
        };
      }
      if (table === 'org_invites') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      organization_id: 'org-1',
                      role: 'member',
                      email: 'other@example.com',
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        userData: { email: 'user@example.com' },
        inviteToken: 'valid-token',
      },
      headers: { authorization: 'Bearer token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invite email does not match signup email' });
  });

  it('returns 200 via invite token when no Bearer (auth from invite + getUserById)', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetUserById.mockResolvedValue({
      data: { user: { id: 'u1', email: 'invited@example.com' } },
      error: null,
    });
    let orgInvitesCalls = 0;
    let userProfilesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_invites') {
        const n = orgInvitesCalls++;
        if (n === 0) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      email: 'invited@example.com',
                      used: false,
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        organization_id: 'org-1',
                        role: 'member',
                        email: 'invited@example.com',
                        expires_at: new Date(Date.now() + 86400000).toISOString(),
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
        }
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        if (n === 2) {
          return {
            insert: () => ({
              select: () =>
                Promise.resolve({
                  data: [{ ...defaultUserProfileRow, email: 'invited@example.com' }],
                  error: null,
                }),
            }),
          };
        }
        return {
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'org_members') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { organization_id: 'org-1', created_at: '2025-01-01T00:00:00Z' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: 'org-1', name: 'Existing Org', logo_url: '' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        userData: { email: 'invited@example.com' },
        inviteToken: 'valid-invite-token',
      },
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        email: 'invited@example.com',
        organization: expect.objectContaining({
          id: 'org-1',
          membership: expect.objectContaining({ role: 'member' }),
        }),
      })
    );
  });

  it('returns 500 when org membership insert fails and attempts cleanup', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    let userProfilesCalls = 0;
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'user_profiles') {
        const n = userProfilesCalls++;
        if (n === 0) {
          return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        if (n === 2) {
          return {
            insert: () => ({
              select: () =>
                Promise.resolve({ data: [defaultUserProfileRow], error: null }),
            }),
          };
        }
        return {
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'membership insert failed', code: 'ERR' },
                }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'org-1', name: 'My Organization', logo_url: '' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-user-account-v2')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', userData: { email: 'user@example.com' } },
      headers: { authorization: 'Bearer token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'membership-creation-failed',
        cleanupAttempted: true,
      })
    );
  });
});
