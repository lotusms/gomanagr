/**
 * Unit tests for insights reverse-geocode API (Nominatim).
 */

function mockRes() {
  return {
    status: jest.fn(function statusFn(c) {
      this.statusCode = c;
      return this;
    }),
    json: jest.fn(function jsonFn(d) {
      this._json = d;
      return this;
    }),
  };
}

describe('pages/api/insights/reverse-geocode', () => {
  let handler;
  const origFetch = global.fetch;
  const origUA = process.env.NOMINATIM_USER_AGENT;

  beforeAll(async () => {
    ({ default: handler } = await import('@/pages/api/insights/reverse-geocode'));
  });

  afterAll(() => {
    global.fetch = origFetch;
    if (origUA === undefined) delete process.env.NOMINATIM_USER_AGENT;
    else process.env.NOMINATIM_USER_AGENT = origUA;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('returns 405 for non-POST', async () => {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 400 when latitude/longitude are invalid or missing', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    const resNoBody = mockRes();
    await handler({ method: 'POST' }, resNoBody);
    expect(resNoBody.status).toHaveBeenCalledWith(400);

    const res2 = mockRes();
    await handler({ method: 'POST', body: { latitude: 91, longitude: 0 } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('returns label from city, state, and country', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: { city: 'Springfield', state: 'IL', country: 'United States' },
      }),
    });
    const res = mockRes();
    await handler(
      { method: 'POST', body: { latitude: 40.1164, longitude: -89.2732, acceptLanguage: '  es  ' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      label: 'Springfield, IL',
      attribution: '© OpenStreetMap contributors',
    });
    expect(global.fetch).toHaveBeenCalled();
    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['Accept-Language']).toBe('es');
  });

  it('returns label from town and country when state is absent', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: { town: 'Oxford', country: 'United Kingdom' },
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 51.75, longitude: -1.25 } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Oxford, United Kingdom' })
    );
  });

  it('returns locality-only label when only village is present', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: { village: 'Tinyville' },
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 1 } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Tinyville' })
    );
  });

  it('handles null address object via formatAddress guard', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: null,
        display_name: 'Fallback City, Region, Nation',
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 1 } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Fallback City, Region, Nation' })
    );
  });

  it('falls back to first segments of display_name when address is unhelpful', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {},
        display_name: 'Alpha, Beta, Gamma, Delta, Echo',
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 0, longitude: 0 } }, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Alpha, Beta, Gamma' })
    );
  });

  it('returns label null when nothing can be derived', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {},
        display_name: '',
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: -1, longitude: -1 } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ label: null });
  });

  it('returns 502 when Nominatim responds with non-OK status', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValue({ ok: false, status: 503 });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 10, longitude: 20 } }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Geocoding service unavailable' });
    spy.mockRestore();
  });

  it('returns 500 when fetch throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValue(new Error('offline'));
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 10, longitude: 20 } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to resolve place name' });
    spy.mockRestore();
  });

  it('uses NOMINATIM_USER_AGENT when set', async () => {
    process.env.NOMINATIM_USER_AGENT = 'CustomAgent/1.0';
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: { city: 'A', state: 'B', country: 'C' },
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 2 } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['User-Agent']).toBe('CustomAgent/1.0');
    delete process.env.NOMINATIM_USER_AGENT;
  });

  it('defaults Accept-Language to en when acceptLanguage is not a non-empty string', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: { city: 'A', state: 'B', country: 'C' },
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 2, acceptLanguage: 123 } }, res);
    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['Accept-Language']).toBe('en');
  });
});
