/**
 * Unit tests for send-proposal-email API.
 * POST only; uses sendTenantEmail (tenant integrations). 503 no org or no provider; 200 when sendTenantEmail succeeds.
 */

const mockSendTenantEmail = jest.fn();

jest.mock('@/lib/sendTenantEmail', () => ({
  sendTenantEmail: (...args) => mockSendTenantEmail(...args),
}));

jest.mock('@/lib/renderDocumentToHtml', () => ({
  renderDocumentToHtml: jest.fn(() => '<html><body>Proposal</body></html>'),
}));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.NEXT_PUBLIC_APP_NAME = 'GoManagr';
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

describe('send-proposal-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendTenantEmail.mockResolvedValue({ sent: true });
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'prop-1',
                      proposal_title: 'Test Proposal',
                      proposal_number: 'P-001',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: 'c1',
                      line_items: [{ item_name: 'Item', quantity: 1, unit_price: 100 }],
                    },
                    error: null,
                  }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { company_name: 'My Co', clients: [] },
                    error: null,
                  }),
            }),
          }),
        })
      };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (t === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId, proposalId, or to missing', async () => {
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { proposalId: 'prop-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing userId, proposalId, or to (client email)',
    });
  });

  it('returns 400 when to is invalid email', async () => {
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'prop-1', to: 'not-an-email' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email address' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'prop-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 404 when proposal not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'bad-id', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal not found' });
  });

  it('returns 403 when proposal does not belong to user (no org)', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'prop-1',
                      user_id: 'other-user',
                      organization_id: null,
                      line_items: [],
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'prop-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal does not belong to you' });
  });

  it('returns 503 when no email provider configured', async () => {
    mockSendTenantEmail.mockResolvedValueOnce({
      sent: false,
      error: 'No email provider configured. Configure Resend or SMTP in Settings > Integrations.',
    });
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', proposalId: 'prop-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('No email provider configured'),
        message: expect.stringMatching(/Settings|Integrations|Resend|SMTP/i),
      })
    );
  });

  it('returns 200 sent: true when sendTenantEmail succeeds', async () => {
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org-1', proposalId: 'prop-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Proposal email sent' });
    expect(mockSendTenantEmail).toHaveBeenCalled();
  });
});
