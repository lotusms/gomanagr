import {
  clientToMailchimpMember,
  loadMergedOrgClients,
  syncOrgClientsToMailchimp,
} from '@/lib/marketing/syncOrgClientsToMailchimp';

const mockGetMailchimpCredentials = jest.fn();
const mockFindOrCreateList = jest.fn();
const mockBatchAddMembers = jest.fn();

jest.mock('@/lib/marketing/mailchimpApiService', () => ({
  getMailchimpCredentials: (...args) => mockGetMailchimpCredentials(...args),
  findOrCreateList: (...args) => mockFindOrCreateList(...args),
  batchAddMembers: (...args) => mockBatchAddMembers(...args),
}));

function createSupabaseMock({ orgMembers, profiles }) {
  const orgChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(orgMembers),
  };
  const profileChain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue(profiles),
  };
  return {
    from: jest.fn((table) => {
      if (table === 'org_members') return orgChain;
      if (table === 'user_profiles') return profileChain;
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe('syncOrgClientsToMailchimp helpers', () => {
  it('clientToMailchimpMember parses name and email', () => {
    expect(
      clientToMailchimpMember({
        email: 'a@b.com',
        firstName: 'Ann',
        lastName: 'Lee',
      })
    ).toEqual({
      email: 'a@b.com',
      firstName: 'Ann',
      lastName: 'Lee',
      name: undefined,
    });
  });

  it('clientToMailchimpMember splits name when first/last missing', () => {
    expect(
      clientToMailchimpMember({
        email: 'x@y.com',
        name: 'Jane Q Public',
      })
    ).toMatchObject({
      email: 'x@y.com',
      firstName: 'Jane',
      lastName: 'Q Public',
    });
  });

  it('clientToMailchimpMember returns null without valid email', () => {
    expect(clientToMailchimpMember({ name: 'No Email' })).toBeNull();
  });

  it('clientToMailchimpMember returns null for non-object', () => {
    expect(clientToMailchimpMember(null)).toBeNull();
  });

  it('clientToMailchimpMember uses single-token name as first name only', () => {
    expect(
      clientToMailchimpMember({
        email: 'solo@x.com',
        name: 'Madonna',
      })
    ).toMatchObject({
      email: 'solo@x.com',
      firstName: 'Madonna',
      lastName: '',
    });
  });
});

describe('loadMergedOrgClients', () => {
  it('returns empty array when org_members query fails', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: null, error: { message: 'fail' } },
      profiles: { data: [], error: null },
    });
    await expect(loadMergedOrgClients(supabase, 'org-1')).resolves.toEqual([]);
  });

  it('returns empty array when org has no members', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: [], error: null },
      profiles: { data: [], error: null },
    });
    await expect(loadMergedOrgClients(supabase, 'org-1')).resolves.toEqual([]);
  });

  it('returns empty array when user_profiles query fails', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: [{ user_id: 'u1' }], error: null },
      profiles: { data: null, error: { message: 'nope' } },
    });
    await expect(loadMergedOrgClients(supabase, 'org-1')).resolves.toEqual([]);
  });

  it('merges clients from profiles, skips inactive, dedupes by email', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: [{ user_id: 'u1' }], error: null },
      profiles: {
        data: [
          {
            clients: [
              'not-an-object',
              { email: 'dup@x.com', firstName: 'A', lastName: 'One', status: 'active' },
              { email: 'dup@x.com', firstName: 'B', lastName: 'Two', status: 'active' },
              { email: 'gone@x.com', status: 'inactive' },
              { email: 'z@x.com', firstName: 'Zed', lastName: '', status: 'active' },
            ],
          },
        ],
        error: null,
      },
    });
    const out = await loadMergedOrgClients(supabase, 'org-1');
    expect(out).toHaveLength(2);
    expect(out.map((m) => m.email).sort()).toEqual(['dup@x.com', 'z@x.com']);
    expect(out.find((m) => m.email === 'dup@x.com').firstName).toBe('A');
  });

  it('treats non-array clients on a profile as empty', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: [{ user_id: 'u1' }], error: null },
      profiles: {
        data: [{ clients: null }],
        error: null,
      },
    });
    await expect(loadMergedOrgClients(supabase, 'org-1')).resolves.toEqual([]);
  });

  it('drops clients that do not map to a valid Mailchimp member', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: [{ user_id: 'u1' }], error: null },
      profiles: {
        data: [
          {
            clients: [{ email: 'not-an-email', firstName: 'X', status: 'active' }],
          },
        ],
        error: null,
      },
    });
    await expect(loadMergedOrgClients(supabase, 'org-1')).resolves.toEqual([]);
  });
});

describe('syncOrgClientsToMailchimp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMailchimpCredentials.mockResolvedValue({
      apiKey: 'k',
      serverPrefix: 'us1',
      senderEmail: 'noreply@example.com',
      senderName: 'Go',
    });
    mockFindOrCreateList.mockResolvedValue('list-99');
    mockBatchAddMembers.mockResolvedValue({ total_created: 2, total_updated: 0, error_count: 0 });
  });

  it('returns error when organizationId or supabase is missing', async () => {
    await expect(syncOrgClientsToMailchimp('', {})).resolves.toEqual({
      success: false,
      synced: 0,
      error: 'Missing organization or database',
    });
    await expect(syncOrgClientsToMailchimp('org-1', null)).resolves.toMatchObject({
      success: false,
      error: 'Missing organization or database',
    });
  });

  it('returns error when Mailchimp credentials are incomplete', async () => {
    mockGetMailchimpCredentials.mockResolvedValue({ apiKey: '', serverPrefix: 'us1', senderEmail: 'a@b.com' });
    const supabase = createSupabaseMock({
      orgMembers: { data: [], error: null },
      profiles: { data: [], error: null },
    });
    await expect(syncOrgClientsToMailchimp('org-1', supabase)).resolves.toEqual({
      success: false,
      synced: 0,
      error: 'Mailchimp is not connected for this organization',
    });
  });

  it('returns error when sender email is not configured', async () => {
    mockGetMailchimpCredentials.mockResolvedValue({
      apiKey: 'k',
      serverPrefix: 'us1',
      senderEmail: '',
      senderName: 'X',
    });
    const supabase = createSupabaseMock({
      orgMembers: { data: [], error: null },
      profiles: { data: [], error: null },
    });
    await expect(syncOrgClientsToMailchimp('org-1', supabase)).resolves.toEqual({
      success: false,
      synced: 0,
      error: 'Mailchimp sender email is not configured in Settings > Integrations',
    });
  });

  it('returns success with zero batch when there are no members to sync', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: [], error: null },
      profiles: { data: [], error: null },
    });
    await expect(syncOrgClientsToMailchimp('org-1', supabase)).resolves.toEqual({
      success: true,
      synced: 0,
      batch: { total_created: 0, total_updated: 0, error_count: 0 },
    });
    expect(mockFindOrCreateList).not.toHaveBeenCalled();
    expect(mockBatchAddMembers).not.toHaveBeenCalled();
  });

  it('finds list, batches members, and returns synced count', async () => {
    const supabase = createSupabaseMock({
      orgMembers: { data: [{ user_id: 'u1' }], error: null },
      profiles: {
        data: [{ clients: [{ email: 'a@b.com', firstName: 'A', lastName: 'B', status: 'active' }] }],
        error: null,
      },
    });
    const res = await syncOrgClientsToMailchimp('org-1', supabase);
    expect(res.success).toBe(true);
    expect(res.synced).toBe(1);
    expect(res.batch).toEqual({ total_created: 2, total_updated: 0, error_count: 0 });
    expect(mockGetMailchimpCredentials).toHaveBeenCalledWith('org-1');
    expect(mockFindOrCreateList).toHaveBeenCalledWith('k', 'us1', 'noreply@example.com', 'Go');
    expect(mockBatchAddMembers).toHaveBeenCalledWith('k', 'us1', 'list-99', [
      expect.objectContaining({ email: 'a@b.com' }),
    ]);
  });
});
