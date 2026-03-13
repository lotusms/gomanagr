/**
 * Unit tests for invite-by-token API (GET).
 * GET only; 400 missing token, 503, 404 invalid/expired invite, 410 used, 410 expired, 200 with email and org name.
 */

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
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

describe('invite-by-token API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((t) => {
      if (t === 'org_invites') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    email: 'invitee@test.com',
                    expires_at: '2099-12-31T23:59:59Z',
                    used: false,
                    organization_id: 'org-1',
                    invitee_data: { role: 'member' },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { name: 'Acme Corp', logo_url: 'https://example.com/logo.png' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-GET', async () => {
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'POST', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when token missing', async () => {
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing token' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { token: 'abc123' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 404 when invite not found or error', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_invites') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { token: 'bad-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired invite' });
  });

  it('returns 410 when invite is used', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_invites') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    email: 'u@test.com',
                    expires_at: '2099-12-31T23:59:59Z',
                    used: true,
                    organization_id: 'org-1',
                    invitee_data: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { token: 'used-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith({
      error: 'This invite is no longer valid. It may have been used or revoked.',
    });
  });

  it('returns 410 when invite has expired', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_invites') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    email: 'u@test.com',
                    expires_at: '2020-01-01T00:00:00Z',
                    used: false,
                    organization_id: null,
                    invitee_data: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { token: 'expired-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith({ error: 'This invite has expired' });
  });

  it('returns 200 with email, organizationName, and optional org logo and inviteeData', async () => {
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: 'invitee@test.com',
      organizationName: 'Acme Corp',
      organizationLogoUrl: 'https://example.com/logo.png',
      inviteeData: { role: 'member' },
    });
  });

  it('returns 200 with default organizationName when no org or org has no name', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'org_invites') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    email: 'u@test.com',
                    expires_at: '2099-12-31T23:59:59Z',
                    used: false,
                    organization_id: null,
                    invitee_data: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/invite-by-token')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: { token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'u@test.com',
        organizationName: 'your organization',
      })
    );
    expect(res.json.mock.calls[0][0].organizationLogoUrl).toBeUndefined();
    expect(res.json.mock.calls[0][0].inviteeData).toBeUndefined();
  });
});
