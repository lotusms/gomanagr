/**
 * Unit tests for update-client-attachment API:
 * - Returns 405 for non-POST/non-PUT
 * - Returns 400 when userId or attachmentId missing
 * - Returns 404 when attachment not found
 * - Updates and preserves existing linked_*_id when not sent in body
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

const existingAttachment = {
  id: 'att-1',
  client_id: 'c1',
  user_id: 'u1',
  organization_id: null,
  file_name: 'doc.pdf',
  file_type: 'pdf',
  description: '',
  upload_date: null,
  related_item: null,
  linked_contract_id: 'contract-1',
  linked_proposal_id: null,
  linked_invoice_id: null,
  linked_email_id: null,
  version: 'draft',
  file_url: 'https://example.com/doc.pdf',
};

describe('update-client-attachment API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: existingAttachment, error: null }),
          update: jest.fn().mockReturnThis(),
        };
      }
      if (table === 'org_members') {
        return {};
      }
      return {};
    });
  });

  it('returns 405 when method is not POST or PUT', async () => {
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or attachmentId is missing', async () => {
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or attachmentId' });
  });

  it('returns 404 when attachment not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', attachmentId: 'att-1', file_name: 'updated.pdf' },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Attachment not found' });
  });

  it('preserves existing linked_contract_id when body does not send linked_contract_id', async () => {
    let capturedUpdates;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: existingAttachment, error: null }),
          update: jest.fn().mockImplementation((updates) => {
            capturedUpdates = updates;
            return { eq: jest.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          userId: 'u1',
          attachmentId: 'att-1',
          file_name: 'renamed.pdf',
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(capturedUpdates.linked_contract_id).toBe('contract-1');
  });

  it('preserves existing linked_proposal_id when body does not send it', async () => {
    const existingWithProposal = { ...existingAttachment, linked_proposal_id: 'prop-1', linked_contract_id: null };
    let capturedUpdates;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: existingWithProposal, error: null }),
          update: jest.fn().mockImplementation((updates) => {
            capturedUpdates = updates;
            return { eq: jest.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: { userId: 'u1', attachmentId: 'att-1', file_name: 'ok.pdf' },
      },
      res
    );
    expect(capturedUpdates.linked_proposal_id).toBe('prop-1');
  });

  it('returns 503 when Supabase unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    jest.resetModules();
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', attachmentId: 'att-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    jest.resetModules();
  });

  it('accepts PUT method', async () => {
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'PUT',
      body: { userId: 'u1', attachmentId: 'att-1', file_name: 'updated.pdf' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 403 when organizationId provided but attachment belongs to different org', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...existingAttachment, organization_id: 'other-org' },
            error: null,
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', attachmentId: 'att-1', organizationId: 'org-1', file_name: 'x.pdf' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Attachment does not belong to this organization' });
  });

  it('returns 403 when organizationId provided but user not org member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...existingAttachment, organization_id: 'org-1' },
            error: null,
          }),
        };
      }
      if (table === 'org_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', attachmentId: 'att-1', organizationId: 'org-1', file_name: 'x.pdf' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 403 when no organizationId but attachment has org or different user', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...existingAttachment, organization_id: 'org-1', user_id: 'u1' },
            error: null,
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u2', attachmentId: 'att-1', file_name: 'x.pdf' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Attachment does not belong to you' });
  });

  it('returns 500 when update fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: existingAttachment, error: null }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'RLS denied' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', attachmentId: 'att-1', file_name: 'x.pdf' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update attachment' });
  });

  it('parses upload_date and related_item in parseBody', async () => {
    let capturedUpdates;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...existingAttachment, upload_date: null, related_item: null },
            error: null,
          }),
          update: jest.fn().mockImplementation((updates) => {
            capturedUpdates = updates;
            return { eq: jest.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        attachmentId: 'att-1',
        file_name: 'f.pdf',
        upload_date: '2024-06-15T12:00:00Z',
        related_item: ' case-1 ',
        version: 'v2',
        file_url: ' https://cdn.example.com/f.pdf ',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(capturedUpdates.upload_date).toBe('2024-06-15');
    expect(capturedUpdates.related_item).toBe('case-1');
    expect(capturedUpdates.version).toBe('v2');
    expect(capturedUpdates.file_url).toBe('https://cdn.example.com/f.pdf');
  });

  it('parses upload_date as date-only string (no T) and clears optional fields', async () => {
    let capturedUpdates;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: existingAttachment, error: null }),
          update: jest.fn().mockImplementation((updates) => {
            capturedUpdates = updates;
            return { eq: jest.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        attachmentId: 'att-1',
        upload_date: '2024-07-01',
        related_item: '',
        file_url: '',
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(capturedUpdates.upload_date).toBe('2024-07-01');
    expect(capturedUpdates.related_item).toBeNull();
    expect(capturedUpdates.file_url).toBeNull();
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_attachments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockRejectedValue(new Error('DB error')),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-attachment')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', attachmentId: 'att-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update attachment' });
  });
});
