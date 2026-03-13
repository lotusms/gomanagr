/**
 * Unit tests for full-backup API (deprecated).
 * POST returns 410 Gone; non-POST returns 405.
 */

describe('full-backup API', () => {
  function mockRes() {
    return {
      status: jest.fn(function (c) {
        this.statusCode = c;
        return this;
      }),
      json: jest.fn(function (d) {
        this._json = d;
        return this;
      }),
    };
  }

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/admin/full-backup')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 410 Gone with message to use org-backup or platform backup', async () => {
    const handler = (await import('@/pages/api/admin/full-backup')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Gone',
        message: expect.stringContaining('org-backup'),
      })
    );
  });
});
