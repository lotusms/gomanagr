const mockFrom = jest.fn();
const mockEnsureAttachmentsFromFiles = jest.fn().mockResolvedValue(undefined);

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));
jest.mock('@/lib/syncFilesToAttachments', () => ({
  ensureAttachmentsFromFiles: (...args) => mockEnsureAttachmentsFromFiles(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json: jest.fn(function (data) { this._json = data; return this; }),
  };
}

const defaultEmail = { id: 'email-1', user_id: 'u1', organization_id: null, client_id: 'c1' };

describe('update-client-email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    let n = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        n++;
        if (n === 1) {
          return {
            select: () => ({ eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: defaultEmail, error: null }) }) }) }),
          };
        }
        return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 for non-POST and non-PUT', async () => {
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('accepts PUT method', async () => {
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'PUT', body: { userId: 'u1', emailId: 'email-1', subject: 'S', direction: 'sent', to_from: 'x', body: 'b' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u1', emailId: 'email-1', subject: 'S' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or emailId missing', async () => {
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or emailId' });
  });

  it('returns 404 when email not found', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u1', emailId: 'bad-id', subject: 'S' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email not found' });
  });

  it('returns 403 when organizationId provided but email belongs to different org', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultEmail, organization_id: 'other-org' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u1', emailId: 'email-1', organizationId: 'org-1', subject: 'S' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email does not belong to this organization' });
  });

  it('returns 403 when organizationId provided but user not org member', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultEmail, organization_id: 'org-1' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (t === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u1', emailId: 'email-1', organizationId: 'org-1', subject: 'S' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 403 when no organizationId but email has org or different user', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...defaultEmail, organization_id: 'org-1', user_id: 'u1' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u2', emailId: 'email-1', subject: 'S' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email does not belong to you' });
  });

  it('returns 500 when update fails', async () => {
    let n = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        n++;
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: defaultEmail, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          update: () => ({ eq: () => Promise.resolve({ error: { message: 'RLS denied' } }) }),
        };
      }
      return {};
    });
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u1', emailId: 'email-1', subject: 'S' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update email' });
  });

  it('calls ensureAttachmentsFromFiles when attachments provided', async () => {
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({
      method: 'POST',
      body: {
        userId: 'u1',
        emailId: 'email-1',
        subject: 'S',
        direction: 'sent',
        to_from: 'x',
        body: 'b',
        attachments: [{ url: 'https://example.com/file.pdf', name: 'file.pdf' }],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockEnsureAttachmentsFromFiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        linkedEmailId: 'email-1',
      })
    );
    const fileUrls = mockEnsureAttachmentsFromFiles.mock.calls[0][1].fileUrls;
    expect(fileUrls).toHaveLength(1);
    expect(fileUrls[0]).toMatchObject({ url: 'https://example.com/file.pdf', name: 'file.pdf' });
  });

  it('parses follow_up_date and direction received', async () => {
    let n = 0;
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        n++;
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { ...defaultEmail, subject: 'Old', follow_up_date: null },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          update: (payload) => {
            expect(payload.direction).toBe('received');
            expect(payload.follow_up_date).toBe('2024-06-15');
            expect(payload.related_project_case).toBe('case-1');
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      return {};
    });
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({
      method: 'POST',
      body: {
        userId: 'u1',
        emailId: 'email-1',
        subject: 'S',
        direction: 'received',
        to_from: 'x',
        body: 'b',
        follow_up_date: '2024-06-15T12:00:00Z',
        related_project_case: 'case-1',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((t) => {
      if (t === 'client_emails') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.reject(new Error('DB error')),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const h = (await import('@/pages/api/update-client-email')).default;
    const res = mockRes();
    await h({ method: 'POST', body: { userId: 'u1', emailId: 'email-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update email' });
  });
});
