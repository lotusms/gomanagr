/**
 * Unit tests for sync-mailchimp-audience API.
 */

const mockSyncOrgClientsToMailchimp = jest.fn();

jest.mock('@/lib/marketing/syncOrgClientsToMailchimp', () => ({
  syncOrgClientsToMailchimp: (...args) => mockSyncOrgClientsToMailchimp(...args),
}));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => mockFrom(table),
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    setHeader: jest.fn(),
    json: jest.fn(function (d) { this._json = d; return this; }),
  };
}

describe('sync-mailchimp-audience API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncOrgClientsToMailchimp.mockResolvedValue({ success: true, synced: 3, batch: {} });
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 403 when user org does not match organizationId', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: { organization_id: 'other-org' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-mailchimp-audience')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 200 with sync result when allowed', async () => {
    const handler = (await import('@/pages/api/sync-mailchimp-audience')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1' },
    }, res);
    expect(mockSyncOrgClientsToMailchimp).toHaveBeenCalledWith('org-1', expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, synced: 3, batch: {} });
  });
});
