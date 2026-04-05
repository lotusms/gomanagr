/**
 * Unit tests for insights weather-stream API (Open-Meteo).
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

const sampleHourly = {
  time: [
    '2025-01-01T00:00',
    '2025-01-01T01:00',
    '2025-01-01T02:00',
  ],
  temperature_2m: [32, 31, 30],
  relative_humidity_2m: [60, 61, 62],
};

describe('pages/api/insights/weather-stream', () => {
  let handler;
  const origFetch = global.fetch;

  beforeAll(async () => {
    ({ default: handler } = await import('@/pages/api/insights/weather-stream'));
  });

  afterAll(() => {
    global.fetch = origFetch;
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

  it('returns 400 when coordinates are invalid', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    const resNullBody = mockRes();
    await handler({ method: 'POST', body: null }, resNullBody);
    expect(resNullBody.status).toHaveBeenCalledWith(400);

    const res2 = mockRes();
    await handler({ method: 'POST', body: { latitude: 0, longitude: 200 } }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  it('requests fahrenheit by default and returns points with meta', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hourly: sampleHourly }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 40.7, longitude: -74 } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.points).toHaveLength(3);
    expect(payload.points[0]).toMatchObject({
      v: 32,
      w: 60,
      isoTime: '2025-01-01T00:00',
    });
    expect(payload.meta.temperatureUnit).toBe('fahrenheit');
    expect(payload.meta.series.v.unit).toBe('°F');
    expect(global.fetch.mock.calls[0][0]).toContain('temperature_unit=fahrenheit');
  });

  it('uses celsius when temperatureUnit is celsius', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hourly: sampleHourly }),
    });
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { latitude: 1, longitude: 2, temperatureUnit: 'celsius' },
    }, res);
    expect(global.fetch.mock.calls[0][0]).toContain('temperature_unit=celsius');
    expect(res.json.mock.calls[0][0].meta.temperatureUnit).toBe('celsius');
    expect(res.json.mock.calls[0][0].meta.series.v.unit).toBe('°C');
  });

  it('returns 502 when Open-Meteo responds with non-OK status', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValue({ ok: false, status: 503 });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 0, longitude: 0 } }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Weather service unavailable' });
    spy.mockRestore();
  });

  it('returns 502 when hourly payload is missing required fields', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hourly: { time: [] } }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid weather response' });
  });

  it('uses ISO string from Date when hourly time slot is falsy', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: [null, '2025-06-01T12:00:00.000Z'],
          temperature_2m: [20, 21],
          relative_humidity_2m: [50, 51],
        },
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 1 } }, res);
    const points = res.json.mock.calls[0][0].points;
    expect(points[0].isoTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof points[1].isoTime).toBe('string');
  });

  it('caps points at 24 and handles non-string time entries', async () => {
    const longTime = Array.from({ length: 30 }, (_, i) => `2025-01-01T${String(i).padStart(2, '0')}:00`);
    const temps = longTime.map((_, i) => i);
    const hum = longTime.map(() => 50);
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: longTime,
          temperature_2m: temps,
          relative_humidity_2m: hum,
        },
      }),
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 1 } }, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.points.length).toBe(24);
  });

  it('returns 500 when fetch throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValue(new Error('net'));
    const res = mockRes();
    await handler({ method: 'POST', body: { latitude: 1, longitude: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load weather' });
    spy.mockRestore();
  });
});
