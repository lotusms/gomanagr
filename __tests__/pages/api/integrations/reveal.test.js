/**
 * Unit tests for pages/api/integrations/reveal.js
 * POST: verify PIN and return decrypted integration config for one provider.
 */

const mockVerifyPin = jest.fn();
jest.mock('@/lib/revealPin', () => ({
  verifyPin: (...args) => mockVerifyPin(...args),
}));

const mockGetOrgIntegration = jest.fn();
jest.mock('@/lib/integrations/get-org-integration', () => ({
  getOrgIntegration: (...args) => mockGetOrgIntegration(...args),
}));

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

function orgMembersChain(allowed = true) {
  const role = allowed ? 'superadmin' : 'member';
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [{ role }], error: null })),
      })),
    })),
  };
}

describe('pages/api/integrations/reveal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') return orgMembersChain(true);
      return {};
    });
    mockVerifyPin.mockResolvedValue({ ok: true });
    mockGetOrgIntegration.mockResolvedValue({ config: { secretKey: 'sk_test_123' } });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId, organizationId, or provider is missing', async () => {
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { organizationId: 'org1', provider: 'stripe', pin: '1234' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId, organizationId, or provider' });

    await handler({
      method: 'POST',
      body: { userId: 'u1', provider: 'stripe', pin: '1234' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', pin: '1234' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid provider', async () => {
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'invalid', pin: '1234' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid provider' });
  });

  it('returns 400 when PIN is missing or empty', async () => {
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'stripe' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'PIN is required' });

    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'stripe', pin: '   ' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when user is not owner or developer', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') return orgMembersChain(false);
      return {};
    });
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'stripe', pin: '1234' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Only org owner or developer can view credentials',
    });
  });

  it('returns 503 when Supabase is not available', async () => {
    mockCreateClient.mockImplementationOnce(() => null);
    jest.resetModules();
    const mod = await import('@/pages/api/integrations/reveal');
    const res = mockRes();
    await mod.default({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'stripe', pin: '1234' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    jest.resetModules();
  });

  it('returns 200 with ok: false when verifyPin fails', async () => {
    mockVerifyPin.mockResolvedValueOnce({ ok: false, error: 'Incorrect PIN' });
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'stripe', pin: 'wrong' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Incorrect PIN' });
    expect(mockGetOrgIntegration).not.toHaveBeenCalled();
  });

  it('returns 200 with ok: true and config: null when integration has no config', async () => {
    mockGetOrgIntegration.mockResolvedValueOnce(null);
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'stripe', pin: '1234' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, config: null });
    expect(mockGetOrgIntegration).toHaveBeenCalledWith('org1', 'stripe');
  });

  it('returns 200 with ok: true and decrypted config when PIN is correct', async () => {
    const config = { secretKey: 'sk_live_xyz', publishableKey: 'pk_live_abc' };
    mockGetOrgIntegration.mockResolvedValueOnce({ config });
    const handler = (await import('@/pages/api/integrations/reveal')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', organizationId: 'org1', provider: 'stripe', pin: '1234' },
    }, res);
    expect(mockVerifyPin).toHaveBeenCalledWith(
      expect.any(Object),
      'u1',
      '1234',
    );
    expect(mockGetOrgIntegration).toHaveBeenCalledWith('org1', 'stripe');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, config });
  });
});
