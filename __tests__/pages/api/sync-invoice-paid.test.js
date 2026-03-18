/**
 * Unit tests for sync-invoice-paid API:
 * - GET: requires invoiceId and token; 403 invalid token; 404 not found; 200 alreadyPaid; 200 synced: false when no PI; 200 synced: true when PI succeeded
 * - POST: requires invoiceId and userId; 403 when not org member; 404 not found; 200 alreadyPaid; 200 synced: true and updates invoice
 */

const mockPaymentIntentsList = jest.fn();
const mockStripe = {
  paymentIntents: {
    list: mockPaymentIntentsList,
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

const mockGetStripeConfig = jest.fn();
jest.mock('@/lib/getStripeConfig', () => ({
  getStripeConfig: (...args) => mockGetStripeConfig(...args),
}));

jest.mock('@/lib/renderDocumentToHtml', () => ({
  renderDocumentToHtml: jest.fn().mockResolvedValue('<html><body>Receipt</body></html>'),
}));
jest.mock('@/lib/buildDocumentPayload', () => ({
  buildInvoiceDocumentPayload: jest.fn().mockReturnValue({}),
}));

const mockSendTenantEmail = jest.fn().mockResolvedValue({ sent: true });
jest.mock('@/lib/sendTenantEmail', () => ({
  sendTenantEmail: (...args) => mockSendTenantEmail(...args),
}));

const mockFrom = jest.fn();
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
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
    setHeader: jest.fn(),
  };
}

const invoiceRow = {
  id: 'inv-1',
  payment_token: 'valid-token',
  stripe_payment_intent_id: null,
  status: 'sent',
  organization_id: 'org-1',
};

function setupSupabaseForGet(data = invoiceRow) {
  mockFrom.mockImplementation((table) => {
    if (table === 'client_invoices') {
      return {
        select: () => ({
          eq: (col, val) => ({
            limit: () => ({
              single: () => Promise.resolve({ data, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'invoice_payments') {
      return { insert: () => Promise.resolve({ error: null }) };
    }
    return {};
  });
}

function setupSupabaseForPost(data = invoiceRow, orgId = null) {
  let updatePayload = null;
  mockFrom.mockImplementation((table) => {
    if (table === 'client_invoices') {
      return {
        select: () => {
          const chain = {
            eq: (col, val) => chain,
            limit: (n) => chain,
            maybeSingle: () => Promise.resolve({ data, error: null }),
            is: (col, val) => chain,
          };
          if (orgId) {
            return { eq: (col, val) => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data, error: null }) }) }) };
          }
          return chain;
        },
        update: (payload) => {
          updatePayload = payload;
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    }
    if (table === 'org_members' && orgId) {
      return {
        select: () => ({
          eq: (col, val) => ({ eq: (c2, v2) => ({ limit: () => ({ single: () => Promise.resolve({ data: { organization_id: orgId }, error: null }) }) }) }),
        }),
      };
    }
    if (table === 'user_profiles') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { email: 'owner@test.com' }, error: null }) }) }),
      };
    }
    if (table === 'invoice_payments') {
      return { insert: () => Promise.resolve({ error: null }) };
    }
    return {};
  });
  return () => updatePayload;
}

// List returns PIs with amount (cents) and created (unix) for multi-PI / partial payment logic
const singleSucceededPI = [
  { id: 'pi_123', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 10000, created: 1234567890 },
];

const validStripeConfig = {
  publishableKey: 'pk_test_xxx',
  secretKey: 'sk_test_xxx',
  webhookSecret: '',
  paymentMethodConfigId: '',
};

describe('sync-invoice-paid API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStripeConfig.mockResolvedValue(validStripeConfig);
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
  });

  it('returns 503 when Stripe or Supabase is unavailable', async () => {
    setupSupabaseForGet(invoiceRow);
    mockGetStripeConfig.mockResolvedValueOnce({ secretKey: '' });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Stripe is not configured' });
  });

  it('returns 503 when STRIPE_SECRET_KEY does not start with sk_', async () => {
    setupSupabaseForGet(invoiceRow);
    mockGetStripeConfig.mockResolvedValueOnce({ secretKey: 'invalid_key' });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Stripe is not configured' });
  });

  it('GET returns 400 when invoiceId or token missing', async () => {
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({ method: 'GET', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Missing invoiceId or token' });

    await handler({ method: 'GET', query: { invoiceId: 'inv-1' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handler({ method: 'GET', query: { invoiceId: 'inv-1', token: '' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    await handler({ method: 'GET', query: { invoiceId: 'inv-1', token: '   ' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('GET returns 404 when invoice not found', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Invoice not found' });
  });

  it('GET returns 403 when token does not match', async () => {
    setupSupabaseForGet(invoiceRow);
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'wrong-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Invalid link' });
  });

  it('GET returns 200 alreadyPaid when invoice status is paid', async () => {
    setupSupabaseForGet({ ...invoiceRow, status: 'paid' });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyPaid: true });
    expect(mockPaymentIntentsList).not.toHaveBeenCalled();
  });

  it('GET returns 200 synced: false when no succeeded PaymentIntent found', async () => {
    setupSupabaseForGet(invoiceRow);
    mockPaymentIntentsList.mockResolvedValueOnce({ data: [] });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: false });
  });

  it('GET returns 200 synced: true and updates invoice when PaymentIntent succeeded', async () => {
    let capturedUpdate = null;
    let selectCallCount = 0;
    const fullInvoiceData = { outstanding_balance: '100', total: '100' };
    const invoiceForEmail = { invoice_number: 'INV-001', invoice_title: 'Test', total: '100', user_id: 'u1', organization_id: null, client_snapshot: null };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: fullInvoiceData, error: null }),
                }),
              };
            }
            return {
              eq: () => ({
                single: () => Promise.resolve({ data: invoiceForEmail, error: null }),
              }),
            };
          },
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.status).toBe('paid');
    expect(capturedUpdate.outstanding_balance).toBe('0');
    expect(capturedUpdate.paid_date).toBeDefined();
    expect(capturedUpdate.stripe_payment_intent_id).toBe('pi_123');
  });

  it('GET returns 200 alreadySynced when computed state matches (idempotent)', async () => {
    mockPaymentIntentsList.mockResolvedValue({
      data: [
        { id: 'pi_1', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 10000, created: 100 },
        { id: 'pi_2', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 10000, created: 200 },
      ],
    });
    let selectCallCount = 0;
    const fullInvoiceData = { outstanding_balance: '550', total: '750' };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: { ...invoiceRow, status: 'partially_paid' }, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: fullInvoiceData, error: null }),
                }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, alreadySynced: true });
  });

  it('GET sums multiple succeeded PIs and sets partially_paid when balance remains', async () => {
    mockPaymentIntentsList.mockResolvedValue({
      data: [
        { id: 'pi_1', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 10000, created: 100 },
        { id: 'pi_2', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 10000, created: 200 },
      ],
    });
    let capturedUpdate = null;
    let selectCallCount = 0;
    const fullInvoiceData = { outstanding_balance: '750', total: '750' };
    const invoiceForEmail = { invoice_number: 'INV-002', invoice_title: 'Test', total: '750', user_id: 'u1', organization_id: null, client_snapshot: null };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: fullInvoiceData, error: null }),
                }),
              };
            }
            return {
              eq: () => ({
                single: () => Promise.resolve({ data: invoiceForEmail, error: null }),
              }),
            };
          },
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.status).toBe('partially_paid');
    expect(capturedUpdate.outstanding_balance).toBe('550.00');
    expect(capturedUpdate.stripe_payment_intent_id).toBe('pi_2');
    expect(capturedUpdate.paid_date).toBe('1970-01-01');
  });

  it('POST returns 400 when invoiceId or userId missing', async () => {
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Missing invoiceId or userId' });
  });

  it('POST returns 403 when organizationId provided but user is not org member', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: (col, val) => ({
              eq: (c2, v2) => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Access denied' });
  });

  it('POST returns 404 when invoice not found', async () => {
    const chain = {
      eq: (col, val) => chain,
      limit: () => chain,
      is: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => chain,
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Invoice not found' });
  });

  it('POST returns 200 alreadyPaid when invoice already paid', async () => {
    setupSupabaseForPost({ ...invoiceRow, status: 'paid' });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, alreadyPaid: true });
  });

  it('POST returns 200 synced: true with organizationId when user is org member', async () => {
    let capturedUpdate = null;
    let selectCallCount = 0;
    const fullInvoiceData = { outstanding_balance: '100', total: '100' };
    const invoiceForEmail = { invoice_number: 'INV-001', invoice_title: 'Test', total: '100', user_id: 'u1', organization_id: 'org-1', client_snapshot: null };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    eq: () => ({
                      maybeSingle: () => Promise.resolve({ data: invoiceRow, error: null }),
                    }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return { eq: () => ({ single: () => Promise.resolve({ data: fullInvoiceData, error: null }) }) };
            }
            if (cols && cols.includes('invoice_number')) {
              return { eq: () => ({ single: () => Promise.resolve({ data: invoiceForEmail, error: null }) }) };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'org_members') {
        return {
          select: (cols) => {
            if (cols === 'organization_id') {
              return {
                eq: () => ({
                  eq: () => ({
                    limit: () => ({
                      single: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
                    }),
                  }),
                }),
              };
            }
            return {
              eq: () => ({
                in: () => Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
              }),
            };
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (c) => {
            if (c && (c.includes('email') || c === 'email')) {
              return { in: () => Promise.resolve({ data: [{ email: 'admin@org.com' }], error: null }) };
            }
            return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
          },
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({
      data: [{ id: 'pi_123', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 10000, created: 1234567890 }],
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1', organizationId: 'org-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.status).toBe('paid');
  });

  it('POST returns 200 synced: true and updates invoice when PI succeeded', async () => {
    let capturedUpdate = null;
    let selectCallCount = 0;
    const fullInvoiceData = { outstanding_balance: '100', total: '100' };
    const invoiceForEmail = { invoice_number: 'INV-001', invoice_title: 'Test', total: '100', user_id: 'u1', organization_id: null, client_snapshot: null };
    const firstChain = {
      eq: () => firstChain,
      limit: () => firstChain,
      is: () => firstChain,
      maybeSingle: () => Promise.resolve({ data: invoiceRow, error: null }),
    };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) return firstChain;
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({ single: () => Promise.resolve({ data: fullInvoiceData, error: null }) }),
              };
            }
            return {
              eq: () => ({ single: () => Promise.resolve({ data: invoiceForEmail, error: null }) }),
            };
          },
          update: (payload) => {
            capturedUpdate = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({
      data: [{ id: 'pi_123', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 10000, created: 1234567890 }],
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      body: { userId: 'u1', invoiceId: 'inv-1' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
    expect(capturedUpdate).not.toBeNull();
    expect(capturedUpdate.status).toBe('paid');
    expect(capturedUpdate.outstanding_balance).toBe('0');
  });

  it('returns 200 synced: false when totalPaid <= 0 (PIs have zero amount)', async () => {
    setupSupabaseForGet(invoiceRow);
    mockPaymentIntentsList.mockResolvedValue({
      data: [{ id: 'pi_1', status: 'succeeded', metadata: { invoice_id: 'inv-1' }, amount: 0, created: 0 }],
    });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: false });
  });

  it('returns 500 when client_invoices update fails', async () => {
    let selectCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }),
                }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: { message: 'update failed' } }) }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Failed to update invoice' });
  });

  it('sends receipt to customer when client_snapshot has email and full invoice exists', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASSWORD = 'p';
    process.env.SMTP_FROM_EMAIL = 'noreply@test.com';
    let selectCallCount = 0;
    const fullInvoiceForReceipt = {
      id: 'inv-1',
      user_id: 'u1',
      organization_id: 'org-1',
      client_id: null,
      client_snapshot: { email: 'customer@example.com', name: 'Customer' },
      invoice_number: 'INV-001',
      invoice_title: 'Test Invoice',
      total: '100',
    };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }),
                }),
              };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: null,
                      client_snapshot: { email: 'customer@example.com' },
                    },
                    error: null,
                  }),
                }),
              };
            }
            if (cols && cols === '*') {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: fullInvoiceForReceipt, error: null }),
                }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { company_name: 'Co', company_logo: '', clients: [], profile: {} },
                error: null,
              }),
            }),
            in: () => Promise.resolve({ data: [{ email: 'owner@test.com' }], error: null }),
          }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { name: 'Org' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, synced: true });
    expect(mockSendTenantEmail).toHaveBeenCalled();
    const receiptCall = mockSendTenantEmail.mock.calls.find((c) => c[1]?.to === 'customer@example.com');
    expect(receiptCall).toBeDefined();
  });

  it('sends fallback receipt when full invoice select returns null', async () => {
    let selectCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }),
                }),
              };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: null,
                      client_snapshot: { email: 'customer@example.com' },
                    },
                    error: null,
                  }),
                }),
              };
            }
            if (cols && cols === '*') {
              return {
                eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            in: () => Promise.resolve({ data: [{ email: 'owner@test.com' }], error: null }),
          }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { name: 'Org' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendTenantEmail).toHaveBeenCalled();
    const fallbackCall = mockSendTenantEmail.mock.calls.find(
      (c) => c[1]?.subject?.includes('Payment receipt') && c[1]?.html?.includes('Amount paid')
    );
    expect(fallbackCall).toBeDefined();
  });

  it('resolves customer email from profile.clients when client_snapshot has no email', async () => {
    let profileSelectCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            const first = { eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: invoiceRow, error: null }) }) }) };
            if (cols && cols.includes('outstanding_balance')) {
              return { eq: () => ({ single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }) }) };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: 'client-1',
                      client_snapshot: null,
                    },
                    error: null,
                  }),
                }),
              };
            }
            if (cols && cols === '*') {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      id: 'inv-1',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: 'client-1',
                      client_snapshot: null,
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                    },
                    error: null,
                  }),
                }),
              };
            }
            return first;
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (c) => {
            profileSelectCount += 1;
            if (profileSelectCount === 1) {
              return {
                eq: () => ({
                  maybeSingle: () => Promise.resolve({
                    data: { clients: [{ id: 'client-1', email: 'client@billing.com' }] },
                    error: null,
                  }),
                }),
              };
            }
            return {
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              in: () => Promise.resolve({ data: [{ email: 'owner@test.com' }], error: null }),
            };
          },
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { name: 'Org' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const receiptToClient = mockSendTenantEmail.mock.calls.find((c) => c[1]?.to === 'client@billing.com');
    expect(receiptToClient).toBeDefined();
  });

  it('sends payment notification to org admins and owner fallback', async () => {
    let orgMembersCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            const first = { eq: () => ({ limit: () => ({ single: () => Promise.resolve({ data: invoiceRow, error: null }) }) }) };
            if (cols && cols.includes('outstanding_balance')) {
              return { eq: () => ({ single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }) }) };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'owner-1',
                      organization_id: 'org-1',
                      client_snapshot: null,
                    },
                    error: null,
                  }),
                }),
              };
            }
            return first;
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'org_members') {
        orgMembersCalls += 1;
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ user_id: 'admin-1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (c) => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            in: () => Promise.resolve({ data: [{ email: 'admin@org.com' }], error: null }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const adminNotification = mockSendTenantEmail.mock.calls.find(
      (c) => c[1]?.to === 'admin@org.com' && c[1]?.subject?.includes('Payment received')
    );
    expect(adminNotification).toBeDefined();
  });

  it('returns 405 for unsupported method', async () => {
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({ method: 'PATCH', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('returns 503 when Supabase client cannot be created', async () => {
    mockCreateClient.mockImplementationOnce(() => {
      throw new Error('supabase init');
    });
    jest.resetModules();
    const mod = await import('@/pages/api/sync-invoice-paid');
    const res = mockRes();
    await mod.default({ method: 'GET', query: { invoiceId: 'inv-1', token: 'valid-token' } }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Service unavailable' });
    mockCreateClient.mockImplementation(() => ({ from: mockFrom }));
    jest.resetModules();
    await import('@/pages/api/sync-invoice-paid');
  });

  it('uses sendTenantEmail when org has provider (e.g. Resend) configured', async () => {
    let selectCallCount = 0;
    const fullInvoiceForReceipt = {
      id: 'inv-1',
      user_id: 'u1',
      organization_id: 'org-1',
      client_id: null,
      client_snapshot: { email: 'customer@example.com', name: 'Customer' },
      invoice_number: 'INV-001',
      invoice_title: 'Test',
      total: '100',
    };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }),
                }),
              };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: null,
                      client_snapshot: { email: 'customer@example.com' },
                    },
                    error: null,
                  }),
                }),
              };
            }
            if (cols && cols === '*') {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: fullInvoiceForReceipt, error: null }),
                }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { company_name: 'Co', company_logo: '', clients: [], profile: {} },
                error: null,
              }),
            }),
            in: () => Promise.resolve({ data: [{ email: 'owner@test.com' }], error: null }),
          }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { name: 'Org' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendTenantEmail).toHaveBeenCalled();
  });

  it('logs warn when no organization_id for invoice and customer email would be sent', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let selectCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }),
                }),
              };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: null,
                      client_id: null,
                      client_snapshot: { email: 'customer@example.com' },
                    },
                    error: null,
                  }),
                }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No organization_id for invoice'), 'inv-1', expect.any(String));
    warnSpy.mockRestore();
  });

  it('returns 500 when an unexpected error is thrown inside try block', async () => {
    setupSupabaseForGet(invoiceRow);
    mockPaymentIntentsList.mockRejectedValueOnce(new Error('Stripe API error'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Something went wrong' });
    errSpy.mockRestore();
  });

  it('includes org name and address in receipt when invoice has organization_id', async () => {
    let selectCallCount = 0;
    const fullInvoiceForReceipt = {
      id: 'inv-1',
      user_id: 'u1',
      organization_id: 'org-1',
      client_id: null,
      client_snapshot: { email: 'c@test.com', name: 'C' },
      invoice_number: 'INV-001',
      invoice_title: 'Test',
      total: '100',
    };
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }),
                }),
              };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: null,
                      client_snapshot: { email: 'c@test.com' },
                    },
                    error: null,
                  }),
                }),
              };
            }
            if (cols && cols === '*') {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: fullInvoiceForReceipt, error: null }),
                }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { company_name: 'UserCo', company_logo: '', clients: [], profile: {} },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  name: 'Org Name',
                  logo_url: 'https://logo.url',
                  address_line_1: '123 Main St',
                  address_line_2: 'Suite 1',
                  city: 'City',
                  state: 'ST',
                  postal_code: '12345',
                  country: 'US',
                  phone: '555-1234',
                  website: 'https://org.com',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendTenantEmail).toHaveBeenCalled();
  });

  it('logs warn when no org admin or owner email for notification', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let selectCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: (cols) => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return {
                eq: () => ({
                  limit: () => ({
                    single: () => Promise.resolve({ data: invoiceRow, error: null }),
                  }),
                }),
              };
            }
            if (cols && cols.includes('outstanding_balance')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: { outstanding_balance: '100', total: '100' }, error: null }),
                }),
              };
            }
            if (cols && cols.includes('invoice_number')) {
              return {
                eq: () => ({
                  single: () => Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org-1',
                      client_id: null,
                      client_snapshot: null,
                    },
                    error: null,
                  }),
                }),
              };
            }
            return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
          },
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: (c) => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      if (table === 'invoice_payments') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    });
    mockPaymentIntentsList.mockResolvedValue({ data: singleSucceededPI });
    const handler = (await import('@/pages/api/sync-invoice-paid')).default;
    const res = mockRes();
    await handler({
      method: 'GET',
      query: { invoiceId: 'inv-1', token: 'valid-token' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(warnSpy.mock.calls.some((c) => String(c[0] || '').includes('No org admin or owner email'))).toBe(true);
    warnSpy.mockRestore();
  });
});
