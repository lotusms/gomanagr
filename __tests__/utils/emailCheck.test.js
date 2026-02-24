const { checkEmailExists } = require('@/utils/emailCheck');

describe('checkEmailExists', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns exists: false for empty or invalid email without calling the API', async () => {
    expect(await checkEmailExists('')).toEqual({ exists: false, methods: [] });
    expect(await checkEmailExists(null)).toEqual({ exists: false, methods: [] });
    expect(await checkEmailExists(undefined)).toEqual({ exists: false, methods: [] });
    expect(await checkEmailExists('notanemail')).toEqual({ exists: false, methods: [] });
    expect(await checkEmailExists('no-at-sign')).toEqual({ exists: false, methods: [] });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns exists: true when API responds that email is already used', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ exists: true, methods: ['email'] }),
    });

    const result = await checkEmailExists('existing@example.com');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/check-email',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'existing@example.com' }),
      })
    );
    expect(result).toEqual({ exists: true, methods: ['email'] });
  });

  it('returns exists: false when API responds that email is available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ exists: false, methods: [] }),
    });

    const result = await checkEmailExists('newuser@example.com');

    expect(result).toEqual({ exists: false, methods: [] });
  });

  it('returns exists: false with error when API returns 429 (quota exceeded)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ error: 'quota-exceeded', message: 'Too many requests' }),
    });

    const result = await checkEmailExists('user@example.com');

    expect(result).toEqual({
      exists: false,
      methods: [],
      error: 'quota-exceeded',
      message: expect.any(String),
    });
  });

  it('returns exists: false with error when API returns 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'Internal server error' }),
    });

    const result = await checkEmailExists('user@example.com');

    expect(result).toEqual({
      exists: false,
      methods: [],
      error: 'server-error',
      message: expect.any(String),
    });
  });

  it('returns exists: false with network error when fetch throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

      const result = await checkEmailExists('user@example.com');

      expect(result).toEqual({
        exists: false,
        methods: [],
        error: 'network-error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
