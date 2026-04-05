/**
 * Unit tests for insightsKpiAggregates: computeInsightKpis, formatCurrencyCompact, formatMomPercent.
 */

import {
  computeInsightKpis,
  formatCurrencyCompact,
  formatMomPercent,
} from '@/lib/insightsKpiAggregates';

jest.mock('@/lib/buildDocumentPayload', () => {
  const actual = jest.requireActual('@/lib/buildDocumentPayload');
  return {
    ...actual,
    buildProposalDocumentPayload: (p) => {
      if (p?.id === 'bad-proposal') throw new Error('bad');
      return actual.buildProposalDocumentPayload(p);
    },
  };
});

describe('computeInsightKpis', () => {
  it('treats non-array clients as zero count', () => {
    const res = computeInsightKpis({ clients: null, invoices: [], proposals: [] });
    expect(res.clientCount).toBe(0);
  });

  it('counts clients and sums open proposal pipeline', () => {
    const res = computeInsightKpis({
      clients: [{ id: '1' }, { id: '2' }],
      invoices: [],
      proposals: [
        {
          id: 'p1',
          status: 'draft',
          line_items: [{ amount: '100' }],
          tax: 0,
          discount: 0,
        },
      ],
    });
    expect(res.clientCount).toBe(2);
    expect(res.pipelineTotal).toBe(100);
  });

  it('skips proposals that throw in buildProposalDocumentPayload', () => {
    const res = computeInsightKpis({
      clients: [],
      invoices: [],
      proposals: [
        { id: 'bad-proposal', status: 'draft' },
        {
          id: 'ok',
          status: 'draft',
          line_items: [{ amount: '50' }],
          tax: 0,
          discount: 0,
        },
      ],
    });
    expect(res.pipelineTotal).toBe(50);
  });

  it('computes partial payment amounts and month-over-month paid', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 2, 15));
    const res = computeInsightKpis({
      clients: [],
      invoices: [
        {
          status: 'partially_paid',
          total: '100',
          outstanding_balance: '40',
          paid_date: new Date(2025, 2, 10),
        },
        {
          status: 'paid',
          total: '200',
          paid_date: new Date(2025, 1, 10),
        },
      ],
      proposals: [],
    });
    expect(res.thisMonthPaid).toBeGreaterThan(0);
    expect(res.lastMonthPaid).toBeGreaterThan(0);
    expect(res.momPercent).not.toBeNull();
    jest.useRealTimers();
  });

  it('sets momPercent to 100 when last month was zero but this month has paid', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 2, 15));
    const res = computeInsightKpis({
      clients: [],
      invoices: [{ status: 'paid', total: '50', paid_date: new Date(2025, 2, 5) }],
      proposals: [],
    });
    expect(res.momPercent).toBe(100);
    jest.useRealTimers();
  });

  it('computes health score from 90d issued vs paid', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 5, 15));
    const res = computeInsightKpis({
      clients: [],
      invoices: [
        {
          status: 'paid',
          total: '100',
          date_issued: new Date(2025, 4, 1),
          paid_date: new Date(2025, 4, 5),
        },
      ],
      proposals: [],
    });
    expect(res.healthScore).not.toBeNull();
    expect(res.healthLabel).toMatch(/Paid vs issued/);
    jest.useRealTimers();
  });

  it('skips MoM allocation when paid date does not map to a month', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 2, 15));
    const res = computeInsightKpis({
      clients: [],
      invoices: [
        { status: 'paid', total: '5', paid_date: 'invalid-date' },
        { status: 'paid', total: '25', paid_date: new Date(2025, 2, 5) },
      ],
      proposals: [],
    });
    expect(res.thisMonthPaid).toBe(25);
    jest.useRealTimers();
  });

  it('ignores null and void invoices in 90d health window', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 6, 15));
    const res = computeInsightKpis({
      clients: [],
      invoices: [
        null,
        { status: 'void', total: '9000', date_issued: new Date(2025, 5, 1) },
        {
          status: 'paid',
          total: '100',
          date_issued: new Date(2025, 5, 10),
          paid_date: new Date(2025, 5, 12),
        },
      ],
      proposals: [],
    });
    expect(res.healthScore).not.toBeNull();
    jest.useRealTimers();
  });

  it('skips 90d issued totals when issue date is missing', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 6, 15));
    const res = computeInsightKpis({
      clients: [],
      invoices: [{ status: 'draft', total: '999' }],
      proposals: [],
    });
    expect(res.healthLabel).toBe('No recent invoices');
    jest.useRealTimers();
  });

  it('uses no recent invoices label when nothing issued in 90d window', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 5, 15));
    const res = computeInsightKpis({
      clients: [],
      invoices: [
        {
          status: 'paid',
          total: '10',
          date_issued: new Date(2020, 0, 1),
          paid_date: new Date(2020, 0, 2),
        },
      ],
      proposals: [],
    });
    expect(res.healthLabel).toBe('No recent invoices');
    jest.useRealTimers();
  });
});

describe('formatCurrencyCompact', () => {
  it('returns em dash for nullish or NaN', () => {
    expect(formatCurrencyCompact(null)).toBe('—');
    expect(formatCurrencyCompact(NaN)).toBe('—');
  });

  it('treats falsy currency as USD', () => {
    expect(formatCurrencyCompact(100, '')).toMatch(/100/);
  });

  it('formats standard and compact notation for large amounts', () => {
    expect(formatCurrencyCompact(500, 'USD')).toMatch(/\$500/);
    expect(formatCurrencyCompact(2_000_000, 'USD')).toMatch(/2/);
  });

  it('falls back when Intl throws', () => {
    const spy = jest.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new RangeError('bad');
    });
    expect(formatCurrencyCompact(1234, 'USD')).toMatch(/1,?234/);
    spy.mockRestore();
  });
});

describe('formatMomPercent', () => {
  it('returns em dash for nullish or NaN', () => {
    expect(formatMomPercent(null)).toBe('—');
    expect(formatMomPercent(NaN)).toBe('—');
  });

  it('formats positive and negative percentages', () => {
    expect(formatMomPercent(12.34)).toMatch(/^\+/);
    expect(formatMomPercent(-5.1)).toBe('-5.1%');
  });
});
