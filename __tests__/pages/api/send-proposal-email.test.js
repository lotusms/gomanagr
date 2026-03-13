/**
 * Unit tests for send-proposal-email API.
 * POST only; 400 missing params / invalid email; 503 Supabase unavailable; 404 proposal not found;
 * 403 ownership; 503 no email provider; 200 sent when SMTP configured.
 */

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.mock('nodemailer', () => ({
  createTransport: (...args) => mockCreateTransport(...args),
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
    delete process.env.SMTP_HOST;
    delete process.env.RESEND_API_KEY;
    mockSendMail.mockResolvedValue(undefined);
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
                      organization_id: null,
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
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'prop-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'No email provider configured',
        message: expect.stringContaining('SMTP'),
      })
    );
  });

  it('returns 200 sent: true when SMTP configured and sendMail succeeds', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASSWORD = 'pass';
    process.env.SMTP_FROM_EMAIL = 'proposals@test.com';
    jest.resetModules();
    const handler = (await import('@/pages/api/send-proposal-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'prop-1', to: 'client@test.com' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sent: true, message: 'Proposal email sent' });
    expect(mockSendMail).toHaveBeenCalled();
  });
});
