/**
 * Unit tests for create-client-project API:
 * - POST only; 405 for other methods
 * - 503 when Supabase unavailable
 * - 400 missing userId or clientId
 * - 403 when organizationId provided and not a member
 * - 500 when insert fails
 * - 201 and id when success (with provided project_number)
 * - 201 and id when success (auto project_number when not provided)
 * - ensureAttachmentsFromFiles called when file_urls provided
 */

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

const mockFormatDocumentId = jest.fn((orgPrefix, docPrefix, datePart, seq) =>
  `${orgPrefix}-${docPrefix}-${datePart}-${String(seq).padStart(3, '0')}`
);
const mockParseDocumentId = jest.fn(() => null);

jest.mock('@/lib/documentIdsServer', () => ({
  formatDocumentId: (...args) => mockFormatDocumentId(...args),
  parseDocumentId: (...args) => mockParseDocumentId(...args),
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

describe('create-client-project API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatDocumentId.mockImplementation((a, b, c, d) =>
      `${(a || 'PER').slice(0, 3)}-${b}-${(c || '').slice(0, 8)}-${String(d).padStart(3, '0')}`
    );
    mockParseDocumentId.mockReturnValue(null);

    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'org-1', id_prefix: 'ABC', name: 'Acme' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'client_projects') {
        const selectChain = {
          eq: () => selectChain,
          is: () => selectChain,
          then: (resolve) => resolve({ data: [], error: null }),
        };
        return {
          select: () => selectChain,
          insert: (row) => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'proj-123' },
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
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clientId: 'c1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('returns 400 when userId or clientId missing', async () => {
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or clientId' });

    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    await handler({ method: 'POST', body: { clientId: 'c1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when organizationId provided and user not a member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clientId: 'c1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 500 when insert fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({ is: () => Promise.resolve({ data: [], error: null }) }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'insert failed' } }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clientId: 'c1', project_number: 'PER-PROJ-20250101-001' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create project' });
  });

  it('returns 201 and id when success with provided project_number', async () => {
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        project_number: 'PER-PROJ-20250101-001',
        project_name: 'My Project',
        status: 'draft',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'proj-123' });
    expect(mockFormatDocumentId).not.toHaveBeenCalled();
  });

  it('returns 201 and generates project_number when not provided (no org)', async () => {
    let insertPayload = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({
              is: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          insert: (row) => {
            insertPayload = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'proj-456' }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clientId: 'c1', project_name: 'New Project' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'proj-456' });
    expect(mockFormatDocumentId).toHaveBeenCalledWith('PER', 'PROJ', expect.any(String), 1);
    expect(insertPayload).not.toBeNull();
    expect(insertPayload.project_number).toBeDefined();
    expect(insertPayload.client_id).toBe('c1');
    expect(insertPayload.user_id).toBe('u1');
    expect(insertPayload.project_name).toBe('New Project');
  });

  it('uses org id_prefix when organizationId and no project_number', async () => {
    let insertPayload = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
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
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'org-1', id_prefix: 'XYZ', name: 'Org' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'client_projects') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
          insert: (row) => {
            insertPayload = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'proj-789' }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        organizationId: 'org-1',
        project_name: 'Org Project',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockFormatDocumentId).toHaveBeenCalledWith('XYZ', 'PROJ', expect.any(String), 1);
    expect(insertPayload.organization_id).toBe('org-1');
  });

  it('calls ensureAttachmentsFromFiles when file_urls provided', async () => {
    const { ensureAttachmentsFromFiles } = await import('@/lib/syncFilesToAttachments');
    ensureAttachmentsFromFiles.mockResolvedValue(undefined);
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        project_number: 'PER-PROJ-20250101-001',
        file_urls: ['https://example.com/file1.pdf'],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(ensureAttachmentsFromFiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        fileUrls: ['https://example.com/file1.pdf'],
        linkedProjectId: 'proj-123',
      })
    );
  });

  it('normalizes status to draft when invalid', async () => {
    let insertPayload = null;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({ is: () => Promise.resolve({ data: [], error: null }) }),
          }),
          insert: (row) => {
            insertPayload = row;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: 'proj-1' }, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        clientId: 'c1',
        status: 'invalid_status',
      },
    }, res);
    expect(insertPayload.status).toBe('draft');
  });

  it('uses existing project numbers to compute next sequence', async () => {
    mockParseDocumentId
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ docPrefix: 'PROJ', sequence: 5 })
      .mockReturnValueOnce({ docPrefix: 'PROJ', sequence: 3 });
    mockFrom.mockImplementation((table) => {
      if (table === 'client_projects') {
        return {
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  data: [
                    { project_number: 'PER-PROJ-20250101-005' },
                    { project_number: 'PER-PROJ-20250101-003' },
                  ],
                  error: null,
                }),
            }),
          }),
          insert: (row) => ({
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: 'proj-seq' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/create-client-project')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', clientId: 'c1' },
    }, res);
    expect(mockFormatDocumentId).toHaveBeenCalledWith('PER', 'PROJ', expect.any(String), 6);
  });
});
