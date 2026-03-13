/**
 * Unit tests for get-org-team-list API:
 * - Returns 405 for non-POST
 * - Returns 400 when organizationId or callerUserId missing
 * - Returns 403 when caller is not a member of the organization
 * - Returns 200 with teamMembers array when caller is org member (any role)
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

describe('get-org-team-list API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: { role: 'member' }, error: null }),
                  }),
                }),
              };
            }
            if (cols === 'user_id') {
              const listPromise = Promise.resolve({
                data: [
                  { user_id: 'u1' },
                  { user_id: 'u2' },
                ],
                error: null,
              });
              const chain = {
                eq: (col, val) => {
                  if (col !== 'role') return Promise.resolve({ data: null, error: null });
                  if (val === 'superadmin') {
                    return {
                      limit: () => ({
                        maybeSingle: () =>
                          Promise.resolve({
                            data: { user_id: 'owner-1' },
                            error: null,
                          }),
                      }),
                    };
                  }
                  // developer / admin: API calls .limit(1); return object with limit returning Promise
                  return {
                    limit: () =>
                      Promise.resolve({
                        data: val === 'developer' ? [{ user_id: 'owner-1' }] : [],
                        error: null,
                      }),
                  };
                },
              };
              return {
                eq: (col) =>
                  col === 'organization_id'
                    ? Object.assign(listPromise, chain)
                    : listPromise,
              };
            }
            return {};
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (cols) => {
            if (typeof cols === 'string' && cols.includes('team_members')) {
              return {
                eq: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { team_members: [] },
                      error: null,
                    }),
                }),
              };
            }
            return {
              in: () =>
                Promise.resolve({
                  data: [
                    { id: 'u1', first_name: 'Alice', last_name: 'A', email: 'alice@test.com' },
                    { id: 'u2', first_name: 'Bob', last_name: 'B', email: 'bob@test.com' },
                  ],
                  error: null,
                }),
            };
          },
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when organizationId or callerUserId is missing', async () => {
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing organizationId or callerUserId',
    });
  });

  it('returns 403 when caller is not a member of the organization', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'role') {
              return {
                eq: () => ({
                  eq: () => ({
                    single: () =>
                      Promise.resolve({ data: null, error: { message: 'not found' } }),
                  }),
                }),
              };
            }
            return {};
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-99' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not a member of this organization',
    });
  });

  it('returns 200 with teamMembers array when caller is org member', async () => {
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org-1', callerUserId: 'user-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.teamMembers).toHaveLength(2);
    expect(payload.teamMembers[0]).toMatchObject({
      id: 'u1',
      user_id: 'u1',
      name: 'Alice A',
      email: 'alice@test.com',
    });
    expect(payload.teamMembers[1]).toMatchObject({
      id: 'u2',
      user_id: 'u2',
      name: 'Bob B',
      email: 'bob@test.com',
    });
  });
});
