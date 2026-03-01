/**
 * Unit tests for lib/syncFilesToAttachments ensureAttachmentsFromFiles:
 * - Inserts client_attachment with draft status and derived file_name when no existing row
 * - Skips insert when a row for same file_url + link already exists
 * - Uses linked_contract_id, linked_proposal_id, linked_invoice_id, linked_email_id as appropriate
 */

const { ensureAttachmentsFromFiles } = require('@/lib/syncFilesToAttachments');

describe('syncFilesToAttachments ensureAttachmentsFromFiles', () => {
  it('inserts one client_attachment with draft and linked_contract_id when no existing row', async () => {
    const insertCalls = [];
    const supabase = {
      from: jest.fn().mockImplementation((table) => {
        if (table !== 'client_attachments') return {};
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          insert: jest.fn().mockImplementation((row) => {
            insertCalls.push(row);
            return Promise.resolve({ error: null });
          }),
        };
      }),
    };
    await ensureAttachmentsFromFiles(supabase, {
      clientId: 'c1',
      userId: 'u1',
      organizationId: 'org1',
      fileUrls: ['https://storage.example.com/path/123-abc-contract.pdf'],
      linkedContractId: 'contract-1',
    });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      client_id: 'c1',
      user_id: 'u1',
      organization_id: 'org1',
      file_url: 'https://storage.example.com/path/123-abc-contract.pdf',
      file_name: '123-abc-contract.pdf',
      file_type: 'pdf',
      version: 'draft',
      linked_contract_id: 'contract-1',
    });
  });

  it('does not insert when a row for same file_url and linked_contract_id already exists', async () => {
    const insertCalls = [];
    const supabase = {
      from: jest.fn().mockImplementation((table) => {
        if (table !== 'client_attachments') return {};
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing-id' } }),
          insert: jest.fn().mockImplementation((row) => {
            insertCalls.push(row);
            return Promise.resolve({ error: null });
          }),
        };
      }),
    };
    await ensureAttachmentsFromFiles(supabase, {
      clientId: 'c1',
      userId: 'u1',
      fileUrls: ['https://example.com/file.pdf'],
      linkedContractId: 'contract-1',
    });
    expect(insertCalls).toHaveLength(0);
  });

  it('inserts with linked_proposal_id when provided', async () => {
    const insertCalls = [];
    const supabase = {
      from: jest.fn().mockImplementation((table) => {
        if (table !== 'client_attachments') return {};
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          insert: jest.fn().mockImplementation((row) => {
            insertCalls.push(row);
            return Promise.resolve({ error: null });
          }),
        };
      }),
    };
    await ensureAttachmentsFromFiles(supabase, {
      clientId: 'c1',
      userId: 'u1',
      fileUrls: ['https://example.com/proposal.pdf'],
      linkedProposalId: 'prop-1',
    });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].linked_proposal_id).toBe('prop-1');
    expect(insertCalls[0].linked_contract_id).toBeUndefined();
  });

  it('returns early when fileUrls is empty', async () => {
    const supabase = {
      from: jest.fn(() => ({ insert: jest.fn() })),
    };
    await ensureAttachmentsFromFiles(supabase, {
      clientId: 'c1',
      userId: 'u1',
      fileUrls: [],
      linkedContractId: 'c-1',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns early when no link (linkedContractId etc) is provided', async () => {
    const supabase = {
      from: jest.fn(() => ({ insert: jest.fn() })),
    };
    await ensureAttachmentsFromFiles(supabase, {
      clientId: 'c1',
      userId: 'u1',
      fileUrls: ['https://example.com/file.pdf'],
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
