/**
 * Unit tests for Stripe webhook handler (pages/api/webhooks/stripe.js).
 * Covers: 405 non-POST, 500 missing config, 400 missing sig / bad signature,
 * 200 unknown event / no invoice_id / not paid / invoice not found / already paid / idempotent,
 * 500 update failed, 200 success (payment_intent.succeeded and checkout.session.completed).
 */

const mockConstructEvent = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn().mockResolvedValue({ charges: { data: [] } });
const mockStripe = jest.fn(() => ({
  webhooks: { constructEvent: mockConstructEvent },
  paymentIntents: { retrieve: mockPaymentIntentsRetrieve },
}));

jest.mock('stripe', () => mockStripe);

const mockGetRawBody = jest.fn();
jest.mock('raw-body', () => ({
  __esModule: true,
  default: (...args) => mockGetRawBody(...args),
}));

jest.mock('@/lib/renderDocumentToHtml', () => ({
  renderDocumentToHtml: jest.fn().mockResolvedValue('<html>Receipt</html>'),
}));
jest.mock('@/lib/buildDocumentPayload', () => ({
  buildInvoiceDocumentPayload: jest.fn().mockReturnValue({}),
}));

const mockSendMail = jest.fn().mockResolvedValue(undefined);
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: mockSendMail }),
}));

const mockFrom = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
  process.env.SMTP_HOST = 'smtp.test.com';
  process.env.SMTP_USER = 'user';
  process.env.SMTP_PASSWORD = 'pass';
  process.env.SMTP_FROM_EMAIL = 'noreply@test.com';
});

function mockRes() {
  const res = {
    statusCode: 200,
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (data) {
      this._json = data;
      return this;
    }),
    send: jest.fn(function (body) {
      this._body = body;
      return this;
    }),
    end: jest.fn(),
    setHeader: jest.fn(),
  };
  return res;
}

function buildPaymentIntentEvent(invoiceId = 'inv-1', amount = 10000) {
  return {
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_123',
        amount,
        metadata: { invoice_id: invoiceId },
        receipt_email: null,
        charges: { data: [] },
      },
    },
  };
}

function buildCheckoutSessionEvent(invoiceId = 'inv-1', amountTotal = 10000, paymentStatus = 'paid') {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        metadata: { invoice_id: invoiceId },
        amount_total: amountTotal,
        payment_status: paymentStatus,
      },
    },
  };
}

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRawBody.mockResolvedValue(Buffer.from('{}'));
    mockConstructEvent.mockImplementation((body, sig, secret) => buildPaymentIntentEvent());
    mockPaymentIntentsRetrieve.mockResolvedValue({ charges: { data: [] } });
  });

  it('returns 405 for non-POST', async () => {
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.end).toHaveBeenCalled();
    expect(mockGetRawBody).not.toHaveBeenCalled();
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, or Supabase missing', async () => {
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    const origSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = '';
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.end).toHaveBeenCalled();
    process.env.STRIPE_WEBHOOK_SECRET = origSecret;
  });

  it('returns 400 when stripe-signature header missing', async () => {
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: {},
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Missing stripe-signature header');
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'bad' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Webhook Error'));
  });

  it('returns 200 for unknown event type', async () => {
    mockConstructEvent.mockReturnValue({ type: 'customer.updated', data: { object: {} } });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 200 for checkout.session.completed when metadata.invoice_id missing', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { metadata: {}, amount_total: 10000, payment_status: 'paid' } },
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 200 for checkout.session.completed when payment_status is not paid', async () => {
    mockConstructEvent.mockReturnValue(
      buildCheckoutSessionEvent('inv-1', 10000, 'unpaid')
    );
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 200 for payment_intent.succeeded when invoice cannot be resolved', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1',
          amount: 10000,
          metadata: {},
          charges: { data: [] },
        },
      },
    });
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 200 when invoice not found in DB', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 200 when invoice already paid (idempotent)', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'inv-1',
                    status: 'paid',
                    outstanding_balance: '0',
                    total: '100',
                    stripe_payment_intent_id: 'pi_other',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 200 when PaymentIntent already applied (idempotent)', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'inv-1',
                    status: 'partially_paid',
                    outstanding_balance: '50',
                    total: '100',
                    stripe_payment_intent_id: 'pi_123',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 500 when client_invoices update fails', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    let clientInvoicesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCalls++;
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'inv-1',
                    status: 'sent',
                    outstanding_balance: '100',
                    total: '100',
                    stripe_payment_intent_id: null,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: { message: 'update failed' } }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Database update failed' });
  });

  it('returns 200 and updates invoice on payment_intent.succeeded success', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1', 10000));
    let clientInvoicesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        const n = ++clientInvoicesCalls;
        if (n === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'inv-1',
                      status: 'sent',
                      outstanding_balance: '100',
                      total: '100',
                      stripe_payment_intent_id: null,
                    },
                    error: null,
                  }),
              }),
            }),
            update: () => ({ eq: () => Promise.resolve({ error: null }) }),
          };
        }
        if (n === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (n === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: null,
                      client_id: null,
                      client_snapshot: { email: 'client@example.com' },
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'inv-1',
                    user_id: 'u1',
                    organization_id: null,
                    client_id: null,
                    client_snapshot: { email: 'client@example.com' },
                    invoice_number: 'INV-001',
                    invoice_title: 'Test',
                    total: '100',
                  },
                  error: null,
                }),
              }),
            }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({ eq: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 200 on checkout.session.completed with invoice_id and paid', async () => {
    mockConstructEvent.mockReturnValue(
      buildCheckoutSessionEvent('inv-1', 10000, 'paid')
    );
    let clientInvoicesCalls = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCalls++;
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data:
                    clientInvoicesCalls === 1
                      ? {
                          id: 'inv-1',
                          status: 'sent',
                          outstanding_balance: '100',
                          total: '100',
                          stripe_payment_intent_id: null,
                        }
                      : {
                          invoice_number: 'INV-001',
                          invoice_title: 'Test',
                          total: '100',
                          user_id: 'u1',
                          organization_id: null,
                          client_id: null,
                          client_snapshot: null,
                        },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
    }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('uses receipt_email from payment_intent and sends full receipt with org/profile data', async () => {
    mockConstructEvent.mockReturnValue({
      ...buildPaymentIntentEvent('inv-1', 10000),
      data: {
        object: {
          id: 'pi_123',
          amount: 10000,
          metadata: { invoice_id: 'inv-1' },
          receipt_email: 'receipt@example.com',
          charges: { data: [] },
        },
      },
    });
    let clientInvoicesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'inv-1',
                      status: 'sent',
                      outstanding_balance: '100',
                      total: '100',
                      stripe_payment_intent_id: null,
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org1',
                      client_id: 'c1',
                      client_snapshot: {},
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 4) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'inv-1',
                      user_id: 'u1',
                      organization_id: 'org1',
                      client_id: 'c1',
                      client_snapshot: { name: 'Client', addressLines: ['123 Main St'] },
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: { company_name: 'Co', company_logo: '', clients: [{ id: 'c1', name: 'Client Name', billingAddress: { address1: '123 Main' } }], profile: {} }, error: null }) }),
            in: (_col, _ids) => Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    name: 'Org Inc',
                    logo_url: 'https://logo.url',
                    address_line_1: '1 Org St',
                    address_line_2: 'Suite 2',
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
              in: () => Promise.resolve({ data: [{ user_id: 'admin1' }], error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('resolves customer email from Stripe paymentIntents.retrieve when receipt_email and charges missing', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_retrieve',
          amount: 5000,
          metadata: { invoice_id: 'inv-2' },
          receipt_email: null,
          charges: { data: [] },
        },
      },
    });
    mockPaymentIntentsRetrieve.mockResolvedValue({
      charges: { data: [{ billing_details: { email: 'billing@example.com' } }] },
    });
    let clientInvoicesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'inv-2', status: 'sent', outstanding_balance: '50', total: '50', stripe_payment_intent_id: null },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-002',
                      invoice_title: 'Inv2',
                      total: '50',
                      user_id: 'u1',
                      organization_id: null,
                      client_id: null,
                      client_snapshot: null,
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 4) {
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }), in: () => Promise.resolve({ data: [], error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith('pi_retrieve', { expand: ['charges.data.billing_details'] });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('resolves customer email from user_profiles.clients when invoice has client_id and user_id', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-3', 10000));
    let clientInvoicesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'inv-3', status: 'sent', outstanding_balance: '100', total: '100', stripe_payment_intent_id: null },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-003',
                      invoice_title: 'Inv3',
                      total: '100',
                      user_id: 'u2',
                      organization_id: null,
                      client_id: 'c2',
                      client_snapshot: null,
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 4) {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: { id: 'inv-3', user_id: 'u2', client_id: 'c2', client_snapshot: {}, invoice_number: 'INV-003', invoice_title: 'Inv3', total: '100' }, error: null }) }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { clients: [{ id: 'c2', email: 'client-from-profile@example.com' }] },
                  error: null,
                }),
            }),
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('sends fallback receipt when fullInvoice select returns null', async () => {
    mockConstructEvent.mockReturnValue({
      ...buildPaymentIntentEvent('inv-1'),
      data: {
        object: {
          id: 'pi_123',
          amount: 10000,
          metadata: { invoice_id: 'inv-1' },
          receipt_email: 'fallback@example.com',
          charges: { data: [] },
        },
      },
    });
    let clientInvoicesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'inv-1', status: 'sent', outstanding_balance: '100', total: '100', stripe_payment_intent_id: null },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: null,
                      client_id: null,
                      client_snapshot: { email: 'c@example.com' },
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 4) {
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }), in: () => Promise.resolve({ data: [], error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.any(String),
        subject: expect.stringContaining('Payment receipt'),
        html: expect.stringContaining('Amount paid'),
      })
    );
  });

  it('continues when sendEmail throws for receipt (logs error)', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    mockSendMail.mockRejectedValueOnce(new Error('SMTP failed'));
    let clientInvoicesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'inv-1', status: 'sent', outstanding_balance: '100', total: '100', stripe_payment_intent_id: null },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
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
            }),
          };
        }
        if (clientInvoicesCall === 4) {
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }), in: () => Promise.resolve({ data: [], error: null }) }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('warns when no customer email for receipt', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    let clientInvoicesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'inv-1', status: 'sent', outstanding_balance: '100', total: '100', stripe_payment_intent_id: null },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: null,
                      client_id: null,
                      client_snapshot: null,
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: { clients: [] }, error: null }) }),
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('sends payment notification to org admins and handles send failure for one admin', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    let sendCallCount = 0;
    mockSendMail.mockImplementation(() => {
      sendCallCount++;
      if (sendCallCount === 1) return Promise.resolve();
      if (sendCallCount === 2) return Promise.reject(new Error('Admin email failed'));
      return Promise.resolve();
    });
    let clientInvoicesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'inv-1', status: 'sent', outstanding_balance: '100', total: '100', stripe_payment_intent_id: null },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'u1',
                      organization_id: 'org1',
                      client_id: null,
                      client_snapshot: { email: 'c@example.com' },
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 4) {
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            in: (_col, _ids) => Promise.resolve({ data: [{ email: 'admin1@example.com' }, { email: 'admin2@example.com' }], error: null }),
          }),
        };
      }
      if (table === 'org_members') {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [{ user_id: 'admin1' }, { user_id: 'admin2' }], error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('falls back to invoice user_id for admin email when no org_members', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    let clientInvoicesCall = 0;
    let userProfilesCall = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        clientInvoicesCall++;
        if (clientInvoicesCall === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: 'inv-1', status: 'sent', outstanding_balance: '100', total: '100', stripe_payment_intent_id: null },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 2) {
          return { update: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        }
        if (clientInvoicesCall === 3) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      invoice_number: 'INV-001',
                      invoice_title: 'Test',
                      total: '100',
                      user_id: 'owner1',
                      organization_id: null,
                      client_id: null,
                      client_snapshot: { email: 'c@example.com' },
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (clientInvoicesCall === 4) {
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === 'user_profiles') {
        userProfilesCall++;
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve(
                  userProfilesCall === 2
                    ? { data: { email: 'owner@example.com' }, error: null }
                    : { data: null, error: null }
                ),
            }),
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com', subject: expect.any(String), html: expect.any(String) })
    );
  });

  it('returns 500 when handler throws (top-level catch)', async () => {
    mockConstructEvent.mockReturnValue(buildPaymentIntentEvent('inv-1'));
    mockFrom.mockImplementation((table) => {
      if (table === 'client_invoices') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.reject(new Error('DB connection lost')),
            }),
          }),
        };
      }
      return {};
    });
    const handler = (await import('@/pages/api/webhooks/stripe')).default;
    const res = mockRes();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook handler error' });
  });
});
