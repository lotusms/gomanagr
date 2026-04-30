/**
 * Tests for pages/api/ai-agent/chat.js — HTTP gates, OpenAI fetch paths, and invoice shortcut.
 */

const mockCreateClient = jest.fn(() => ({}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

function mockRes() {
  return {
    setHeader: jest.fn(),
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(data) {
      this._json = data;
      return this;
    }),
  };
}

describe('pages/api/ai-agent/chat — gates', () => {
  const savedOpenAi = process.env.OPENAI_API_KEY;
  const savedOpenAiAlt = process.env.OPEN_AI_API_KEY;

  afterEach(() => {
    if (savedOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedOpenAi;
    if (savedOpenAiAlt === undefined) delete process.env.OPEN_AI_API_KEY;
    else process.env.OPEN_AI_API_KEY = savedOpenAiAlt;
  });

  it('returns 405 when method is not POST', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const handler = (await import('@/pages/api/ai-agent/chat')).default;
    const res = mockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 500 when OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPEN_AI_API_KEY;
    const handler = (await import('@/pages/api/ai-agent/chat')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing OPENAI_API_KEY on server.' });
  });

  it('returns 400 when there is no user message', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const handler = (await import('@/pages/api/ai-agent/chat')).default;
    const res = mockRes();
    await handler({ method: 'POST', body: { messages: [] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'A user message is required.' });
  });

  it('returns 400 when the last message is not from the user', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const handler = (await import('@/pages/api/ai-agent/chat')).default;
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          messages: [
            { role: 'user', content: 'hello' },
            { role: 'assistant', content: 'hi there' },
          ],
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'A user message is required.' });
  });
});

describe('pages/api/ai-agent/chat — OpenAI & invoice paths', () => {
  const savedOpenAi = process.env.OPENAI_API_KEY;
  const savedOpenAiAlt = process.env.OPEN_AI_API_KEY;
  const savedSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const savedServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockReset();
    mockCreateClient.mockImplementation(() => ({}));
    process.env.OPENAI_API_KEY = 'sk-test';
    delete process.env.OPEN_AI_API_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    if (savedOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = savedOpenAi;
    if (savedOpenAiAlt === undefined) delete process.env.OPEN_AI_API_KEY;
    else process.env.OPEN_AI_API_KEY = savedOpenAiAlt;
    if (savedSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = savedSupabaseUrl;
    if (savedServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = savedServiceKey;
    jest.clearAllMocks();
  });

  async function loadHandler() {
    return (await import('@/pages/api/ai-agent/chat')).default;
  }

  function bodyForGeneral() {
    return {
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'What is a black hole in one sentence?' }],
        userId: null,
        organizationId: null,
      },
    };
  }

  it('returns 200 when web search responses API returns output_text', async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/v1/responses')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ output_text: '  Stars collapse.  ' }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    const handler = await loadHandler();
    const res = mockRes();
    await handler(bodyForGeneral(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Stars collapse.' });
  });

  it('falls back to chat completions when web search returns non-OK', async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/v1/responses')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      if (String(url).includes('/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: '  Fallback answer.  ' } }] }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    const handler = await loadHandler();
    const res = mockRes();
    await handler(bodyForGeneral(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Fallback answer.' });
  });

  it('returns 502 when chat completions fails', async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/v1/responses')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      if (String(url).includes('/v1/chat/completions')) {
        return Promise.resolve({
          ok: false,
          text: () => Promise.resolve('upstream error body'),
          json: () => Promise.resolve({}),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    const handler = await loadHandler();
    const res = mockRes();
    await handler(bodyForGeneral(), res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json.mock.calls[0][0].error).toBe('OpenAI request failed.');
  });

  it('returns 502 when model returns no message content', async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/v1/responses')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      if (String(url).includes('/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: '' } }] }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    const handler = await loadHandler();
    const res = mockRes();
    await handler(bodyForGeneral(), res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'No content returned by model.' })
    );
  });

  it('returns 200 when invoice insight cannot be loaded', async () => {
    mockCreateClient.mockImplementation(() => ({
      from: jest.fn((table) => {
        if (table === 'org_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    }));

    const handler = await loadHandler();
    const res = mockRes();
    await handler(
      {
        method: 'POST',
        body: {
          messages: [{ role: 'user', content: 'Which invoices have due dates outstanding?' }],
          userId: 'u1',
          organizationId: 'org-1',
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].message).toMatch(/could not load live invoice data/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 500 when fetch throws after gates', async () => {
    global.fetch.mockImplementation(() => Promise.reject(new Error('network')));
    const handler = await loadHandler();
    const res = mockRes();
    await handler(bodyForGeneral(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error).toBe('Failed to process AI request.');
    expect(res.json.mock.calls[0][0].details).toBe('network');
  });
});
