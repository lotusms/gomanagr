/**
 * Unit tests for pages/api/settings/reveal-pin.js
 * POST: set, verify, or status for credentials reveal PIN.
 */

const mockHashPin = jest.fn();
const mockVerifyPin = jest.fn();
jest.mock('@/lib/revealPin', () => ({
  hashPin: (...args) => mockHashPin(...args),
  verifyPin: (...args) => mockVerifyPin(...args),
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

function chainFrom(table) {
  if (table !== 'user_profiles') return {};
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: () => Promise.resolve({ data: { profile: {} }, error: null }),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
  };
}

describe('pages/api/settings/reveal-pin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation(chainFrom);
    mockHashPin.mockImplementation((pin) => (pin ? `hash:${pin}` : null));
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/settings/reveal-pin')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when userId is missing', async () => {
    const handler = (await import('@/pages/api/settings/reveal-pin')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing userId' });
  });

  it('returns 503 when Supabase is not available', async () => {
    mockCreateClient.mockImplementationOnce(() => null);
    jest.resetModules();
    const mod = await import('@/pages/api/settings/reveal-pin');
    const res = mockRes();
    await mod.default({
      method: 'POST',
      body: { userId: 'u1', action: 'status' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
  });

  it('returns 400 for invalid action', async () => {
    const handler = (await import('@/pages/api/settings/reveal-pin')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { userId: 'u1', action: 'delete' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid action; use set, verify, or status' });
  });

  describe('action: status', () => {
    it('returns 200 with isSet: false when profile has no PIN', async () => {
      mockFrom.mockImplementation((table) => {
        if (table !== 'user_profiles') return {};
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: () => Promise.resolve({ data: { profile: {} }, error: null }),
            })),
          })),
        };
      });
      const handler = (await import('@/pages/api/settings/reveal-pin')).default;
      const res = mockRes();
      await handler({ method: 'POST', body: { userId: 'u1', action: 'status' } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ isSet: false });
    });

    it('returns 200 with isSet: true when profile has credentialsRevealPinHash', async () => {
      mockFrom.mockImplementation((table) => {
        if (table !== 'user_profiles') return {};
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: () => Promise.resolve({
                data: { profile: { credentialsRevealPinHash: 'abc123' } },
                error: null,
              }),
            })),
          })),
        };
      });
      const handler = (await import('@/pages/api/settings/reveal-pin')).default;
      const res = mockRes();
      await handler({ method: 'POST', body: { userId: 'u1', action: 'status' } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ isSet: true });
    });
  });

  describe('action: set', () => {
    it('returns 400 when PIN length is less than 4', async () => {
      const handler = (await import('@/pages/api/settings/reveal-pin')).default;
      const res = mockRes();
      await handler({ method: 'POST', body: { userId: 'u1', action: 'set', pin: '123' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'PIN must be 4–8 digits or characters',
      });
    });

    it('returns 400 when PIN length is greater than 8', async () => {
      const handler = (await import('@/pages/api/settings/reveal-pin')).default;
      const res = mockRes();
      await handler({ method: 'POST', body: { userId: 'u1', action: 'set', pin: '123456789' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'PIN must be 4–8 digits or characters',
      });
    });

    it('returns 200 and updates profile when PIN is valid', async () => {
      let capturedUpdate;
      mockFrom.mockImplementation((table) => {
        if (table !== 'user_profiles') return {};
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: () => Promise.resolve({ data: { profile: {} }, error: null }),
            })),
          })),
          update: jest.fn((payload) => {
            capturedUpdate = payload;
            return { eq: jest.fn(() => Promise.resolve({ error: null })) };
          }),
        };
      });
      const handler = (await import('@/pages/api/settings/reveal-pin')).default;
      const res = mockRes();
      await handler({ method: 'POST', body: { userId: 'u1', action: 'set', pin: '1234' } }, res);
      expect(mockHashPin).toHaveBeenCalledWith('1234');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
      expect(capturedUpdate.profile.credentialsRevealPinHash).toBe('hash:1234');
    });
  });

  describe('action: verify', () => {
    it('returns 200 with ok: false when verifyPin returns error', async () => {
      mockVerifyPin.mockResolvedValueOnce({ ok: false, error: 'Incorrect PIN' });
      const handler = (await import('@/pages/api/settings/reveal-pin')).default;
      const res = mockRes();
      await handler({
        method: 'POST',
        body: { userId: 'u1', action: 'verify', pin: 'wrong' },
      }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Incorrect PIN' });
    });

    it('returns 200 with ok: true when verifyPin succeeds', async () => {
      mockVerifyPin.mockResolvedValueOnce({ ok: true });
      const handler = (await import('@/pages/api/settings/reveal-pin')).default;
      const res = mockRes();
      await handler({
        method: 'POST',
        body: { userId: 'u1', action: 'verify', pin: '1234' },
      }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true, error: undefined });
    });
  });
});
