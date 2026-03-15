/**
 * Unit tests for update-client-proposal API:
 * - Returns 405 for non-POST/PUT
 * - Returns 400 when userId or proposalId missing
 * - Returns 404 when proposal not found
 * - Returns 200 when update succeeds
 * - When linked_contract_id is set, updates that contract's related_proposal_id (bidirectional link)
 * - When linked_contract_id is cleared or changed, clears old contract's related_proposal_id
 */

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));
const mockEnsureAttachmentsFromFiles = jest.fn().mockResolvedValue(undefined);

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
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

const existingProposal = {
  id: 'proposal-1',
  client_id: 'c1',
  user_id: 'u1',
  organization_id: null,
  proposal_title: 'Original',
  proposal_number: 'P-001',
  status: 'draft',
  linked_contract_id: null,
};

describe('update-client-proposal API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: existingProposal, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'client_contracts') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  it('returns 405 when method is not POST or PUT', async () => {
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: { userId: 'u1', proposalId: 'proposal-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId or proposalId is missing', async () => {
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId or proposalId' });
  });

  it('returns 404 when proposal not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
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
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'nonexistent', proposal_title: 'Updated' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal not found' });
  });

  it('returns 200 when update succeeds', async () => {
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'proposal-1', proposal_title: 'Updated Title' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('updates contract related_proposal_id when linked_contract_id is set', async () => {
    let contractUpdatePayload;
    let contractEqId;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: existingProposal, error: null }),
              }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'client_contracts') {
        return {
          update: (payload) => {
            contractUpdatePayload = payload;
            return {
              eq: (_col, id) => {
                contractEqId = id;
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'proposal-1', linked_contract_id: 'contract-abc' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(contractUpdatePayload).toBeDefined();
    expect(contractUpdatePayload.related_proposal_id).toBe('proposal-1');
    expect(contractEqId).toBe('contract-abc');
  });

  it('returns 403 when organizationId provided but proposal belongs to different org', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...existingProposal, organization_id: 'other-org' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'proposal-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal does not belong to this organization' });
  });

  it('returns 403 when organizationId provided but user not org member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...existingProposal, organization_id: 'org-1' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
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
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'proposal-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this organization' });
  });

  it('returns 403 when no organizationId but proposal has org or different user', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve({
                    data: { ...existingProposal, organization_id: 'org-1', user_id: 'u1' },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u2', proposalId: 'proposal-1', proposal_title: 'X' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Proposal does not belong to you' });
  });

  it('accepts file_urls and calls ensureAttachmentsFromFiles', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: existingProposal, error: null }),
              }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        proposalId: 'proposal-1',
        file_urls: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockEnsureAttachmentsFromFiles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        fileUrls: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
        linkedProposalId: 'proposal-1',
      })
    );
  });

  it('returns 500 when proposal update fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: existingProposal, error: null }),
              }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: { message: 'RLS denied' } }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'proposal-1', proposal_title: 'X' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update proposal' });
  });

  it('clears old contract related_proposal_id when linked_contract_id changes', async () => {
    const proposalWithContract = { ...existingProposal, linked_contract_id: 'old-contract' };
    const contractPayloads = [];
    let contractCallNum = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: proposalWithContract, error: null }),
              }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'client_contracts') {
        return {
          update: (payload) => {
            contractPayloads.push(payload);
            contractCallNum++;
            return {
              eq: (_col, _id) =>
                contractCallNum === 1
                  ? { eq: () => Promise.resolve({ error: null }) }
                  : Promise.resolve({ error: null }),
            };
          },
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'proposal-1', linked_contract_id: 'new-contract' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(contractPayloads.some((p) => p.related_proposal_id === null)).toBe(true);
    expect(contractPayloads.some((p) => p.related_proposal_id === 'proposal-1')).toBe(true);
  });

  it('accepts line_items and normalizes them', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: existingProposal, error: null }),
              }),
            }),
          }),
          update: (payload) => ({
            eq: () => {
              expect(payload.line_items).toBeDefined();
              expect(Array.isArray(payload.line_items)).toBe(true);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: {
        userId: 'u1',
        proposalId: 'proposal-1',
        status: 'sent',
        line_items: [
          { item_name: 'Item A', quantity: 2, unit_price: '10.50', amount: '21.00' },
          { item_name: '', description: 'Only desc', quantity: 1, unit_price: '5' },
        ],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 when handler throws', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_proposals') {
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
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', proposalId: 'proposal-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update proposal' });
  });

  it('accepts PUT method', async () => {
    const handler = (await import('@/pages/api/update-client-proposal')).default;
    const res = mockRes();
    await handler({
      method: 'PUT',
      body: { userId: 'u1', proposalId: 'proposal-1', proposal_title: 'Updated' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
