/**
 * Covers get-org-team-list.js top-level catch when createClient throws at module load (line ~21).
 * Kept separate so the default mock in get-org-team-list.test.js is unchanged.
 */

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => {
    throw new Error('Supabase client init failed');
  }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

function mockRes() {
  return {
    status: jest.fn(function statusFn(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function jsonFn(data) {
      this._json = data;
      return this;
    }),
  };
}

describe('get-org-team-list API (createClient throws at init)', () => {
  it('returns 503 when createClient throws during module initialization', async () => {
    jest.resetModules();
    const handler = (await import('@/pages/api/get-org-team-list')).default;
    const res = mockRes();
    await handler(
      { method: 'POST', body: { organizationId: 'org-1', callerUserId: 'user-1' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Service unavailable' });
  });
});
