/**
 * Unit tests for get-org-clients API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId is missing
 * - Returns 200 with clients [] when user is not in org
 * - Returns 200 with merged clients and addedByName when org has profiles with clients
 */

let orgMembersCallCount = 0;
const mockFrom = jest.fn((table) => {
  if (table === 'org_members') {
    orgMembersCallCount++;
    if (orgMembersCallCount === 1) {
      return {
        select: () => ({
          eq: () => ({
            limit: () => ({
              single: () =>
                Promise.resolve({ data: null, error: { message: 'not in org' } }),
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    };
  }
  if (table === 'user_profiles') {
    return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
  }
  return {};
});

const mockGetUserById = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
const mockCreateClient = jest.fn(() => ({
  from: mockFrom,
  auth: { admin: { getUserById: mockGetUserById } },
}));

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

describe('get-org-clients API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orgMembersCallCount = 0;
    mockGetUserById.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('returns 405 when method is not POST', async () => {
    const getOrgClientsHandler = (await import('@/pages/api/get-org-clients')).default;
    const req = { method: 'GET', body: {} };
    const res = mockRes();

    await getOrgClientsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId is missing', async () => {
    const getOrgClientsHandler = (await import('@/pages/api/get-org-clients')).default;
    const req = { method: 'POST', body: {} };
    const res = mockRes();

    await getOrgClientsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 200 with empty clients when user is not in org', async () => {
    const getOrgClientsHandler = (await import('@/pages/api/get-org-clients')).default;
    const req = { method: 'POST', body: { userId: 'user-1' } };
    const res = mockRes();

    await getOrgClientsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ clients: [], isOrgAdmin: false });
  });

  it('returns 200 with merged clients and addedByName when org has profiles with clients', async () => {
    let orgCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        orgCall++;
        if (orgCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1', role: 'admin' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ user_id: 'owner-1' }, { user_id: 'user-2' }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'owner-1',
                    first_name: 'Jane',
                    last_name: 'Doe',
                    clients: [{ id: 'c1', name: 'Acme', addedBy: 'owner-1' }],
                    team_members: [],
                  },
                  {
                    id: 'user-2',
                    first_name: 'Bob',
                    last_name: 'Smith',
                    clients: [],
                    team_members: [],
                  },
                ],
                error: null,
              }),
          }),
        };
      }
      return {};
    });

    const getOrgClientsHandler = (await import('@/pages/api/get-org-clients')).default;
    const req = { method: 'POST', body: { userId: 'user-1' } };
    const res = mockRes();

    await getOrgClientsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.clients).toHaveLength(1);
    expect(payload.clients[0].name).toBe('Acme');
    expect(payload.clients[0].addedByName).toBe('Jane Doe');
    expect(payload.isOrgAdmin).toBe(true);
  });

  it('uses profile email for addedByName when first and last name are empty', async () => {
    let orgCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        orgCall++;
        if (orgCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1', role: 'member' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ user_id: 'creator-1' }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'creator-1',
                    first_name: '',
                    last_name: '',
                    email: 'l.silva@example.com',
                    clients: [{ id: 'c1', name: 'Acme', addedBy: 'creator-1' }],
                    team_members: [],
                  },
                ],
                error: null,
              }),
          }),
        };
      }
      return {};
    });

    const getOrgClientsHandler = (await import('@/pages/api/get-org-clients')).default;
    const req = { method: 'POST', body: { userId: 'user-1' } };
    const res = mockRes();

    await getOrgClientsHandler(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.clients[0].addedByName).toBe('l.silva@example.com');
  });

  it('uses Auth user_metadata display name for addedByName when profile has only email', async () => {
    let orgCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        orgCall++;
        if (orgCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1', role: 'member' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ user_id: 'creator-1' }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'creator-1',
                    first_name: '',
                    last_name: '',
                    email: 'l.silva@example.com',
                    clients: [{ id: 'c1', name: 'Acme', addedBy: 'creator-1' }],
                    team_members: [],
                  },
                ],
                error: null,
              }),
          }),
        };
      }
      return {};
    });

    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          user_metadata: { full_name: 'Luis Silva' },
        },
      },
      error: null,
    });

    const getOrgClientsHandler = (await import('@/pages/api/get-org-clients')).default;
    const req = { method: 'POST', body: { userId: 'user-1' } };
    const res = mockRes();

    await getOrgClientsHandler(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.clients[0].addedByName).toBe('Luis Silva');
    expect(mockGetUserById).toHaveBeenCalledWith('creator-1');
  });

  it('prefers team_members roster first+last over profile email when profile names are empty', async () => {
    let orgCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        orgCall++;
        if (orgCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { organization_id: 'org-1', role: 'member' },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ user_id: 'creator-1' }, { user_id: 'owner-1' }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'creator-1',
                    first_name: '',
                    last_name: '',
                    email: 'l.silva@example.com',
                    clients: [{ id: 'c1', name: 'Acme', addedBy: 'creator-1' }],
                    team_members: [],
                  },
                  {
                    id: 'owner-1',
                    first_name: 'Owner',
                    last_name: 'Admin',
                    email: 'owner@example.com',
                    clients: [],
                    team_members: [
                      {
                        userId: 'creator-1',
                        firstName: 'Luis',
                        lastName: 'Silva',
                        email: 'l.silva@example.com',
                      },
                    ],
                  },
                ],
                error: null,
              }),
          }),
        };
      }
      return {};
    });

    const getOrgClientsHandler = (await import('@/pages/api/get-org-clients')).default;
    const req = { method: 'POST', body: { userId: 'user-1' } };
    const res = mockRes();

    await getOrgClientsHandler(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.clients[0].addedByName).toBe('Luis Silva');
  });
});
