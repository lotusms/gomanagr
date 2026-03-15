/**
 * Unit tests for create-client-email API:
 * - Returns 405 for non-POST
 * - Returns 400 when userId or clientId missing
 * - Returns 201 with id when insert succeeds
 */

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));
jest.mock('@/lib/syncFilesToAttachments', () => ({
  ensureAttachmentsFromFiles: jest.fn().mockResolvedValue(undefined),
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

describe('create-client-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_emails') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-email-id' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST', async () => {
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or clientId is missing', async () => {
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });
  });

  it('returns 201 with id when insert succeeds', async () => {
    const handler = (await import('@/pages/api/create-client-email')).default;
    const req = {
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        subject: 'Test',
        direction: 'sent',
        to_from: 'a@b.com',
        body: 'Body',
      },
    };
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-email-id' })
    );
  });

  it('returns 503 when Supabase unavailable', async () => {
    const orig = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    jest.resetModules();
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1', subject: 'S' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = orig;
    jest.resetModules();
  });

  it('returns 403 when organizationId set but user not a member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'client_emails') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'new-id' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', subject: 'S', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when insert returns error', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_emails') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'db error' },
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { userId: 'u1', clientId: 'c1', subject: 'S' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create email' });
  });

  it('calls ensureAttachmentsFromFiles when attachments provided', async () => {
    const { ensureAttachmentsFromFiles } = await import('@/lib/syncFilesToAttachments');
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        subject: 'With attachments',
        direction: 'sent',
        to_from: 'x@y.com',
        body: 'Body',
        attachments: [
          'https://example.com/file.pdf',
          { url: 'https://example.com/doc.pdf', name: 'Doc' },
        ],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(ensureAttachmentsFromFiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        fileUrls: [
          { url: 'https://example.com/file.pdf', name: null },
          { url: 'https://example.com/doc.pdf', name: 'Doc' },
        ],
        linkedEmailId: 'new-email-id',
      })
    );
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.reject(new Error('connection lost')),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', clientId: 'c1', subject: 'S', organizationId: 'org1' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create email' });
  });

  it('parses direction received, sent_at, follow_up_date, related_project_case', async () => {
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        subject: 'Received',
        direction: 'received',
        to_from: 'sender@example.com',
        body: 'Content',
        sent_at: '2024-01-15T12:00:00Z',
        follow_up_date: '2024-02-01',
        related_project_case: 'case-123',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.email.direction).toBe('received');
    expect(payload.email.related_project_case).toBe('case-123');
    expect(payload.email.sent_at).toBe('2024-01-15T12:00:00.000Z');
    expect(payload.email.follow_up_date).toBe('2024-02-01');
  });

  it('parses follow_up_date with T for date-only', async () => {
    const handler = (await import('@/pages/api/create-client-email')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        subject: 'Follow up',
        to_from: 'a@b.com',
        body: 'Body',
        follow_up_date: '2024-03-10T00:00:00Z',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.email.follow_up_date).toBe('2024-03-10');
  });
});
