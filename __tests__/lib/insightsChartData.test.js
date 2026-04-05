/**
 * Unit tests for buildInsightsChartBundle: sunburst root value, pie fallback, paid-by-client rollups.
 */

import { buildInsightsChartBundle } from '@/lib/insightsChartData';

jest.mock('@/lib/buildDocumentPayload', () => {
  const actual = jest.requireActual('@/lib/buildDocumentPayload');
  return {
    ...actual,
    buildProposalDocumentPayload: (p) => {
      if (p?.id === 'bad-chart-proposal') throw new Error('bad');
      return actual.buildProposalDocumentPayload(p);
    },
  };
});

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => {
    const map = {
      client: 'Clients',
      invoice: 'Invoices',
      proposal: 'Proposals',
      services: 'Services',
      team: 'Team',
    };
    return map[key] || key;
  },
  getTermSingular: (t) => (t === 'Clients' ? 'Client' : t),
}));

describe('buildInsightsChartBundle', () => {
  it('returns sunburst root value equal to sum of child values (Recharts scale requires root.value)', () => {
    const bundle = buildInsightsChartBundle({
      clients: [
        { id: 'c1', companyName: 'Acme', firstName: '', lastName: '', email: '' },
        { id: 'c2', companyName: 'Beta', firstName: '', lastName: '', email: '' },
      ],
      invoices: [
        {
          client_id: 'c1',
          status: 'paid',
          total: '100',
          outstanding_balance: '0',
          paid_date: '2024-06-15',
        },
        {
          client_id: 'c2',
          status: 'paid',
          total: '250.40',
          outstanding_balance: '0',
          paid_date: '2024-06-15',
        },
      ],
      proposals: [],
      industry: '',
    });

    const { sunburstData } = bundle;
    const childSum = sunburstData.children.reduce((s, c) => s + c.value, 0);
    expect(sunburstData.value).toBe(childSum);
    expect(sunburstData.value).toBe(350); // 100 + round(250.40)
    expect(sunburstData.children).toHaveLength(2);
    expect(sunburstData.children.map((c) => c.name)).toContain('Acme');
    expect(sunburstData.children.map((c) => c.name)).toContain('Beta');
  });

  it('when no paid-by-client data, sunburst has placeholder child and root value >= 1', () => {
    const bundle = buildInsightsChartBundle({
      clients: [],
      invoices: [],
      proposals: [],
      industry: '',
    });
    const { sunburstData } = bundle;
    expect(sunburstData.value).toBeGreaterThanOrEqual(1);
    expect(sunburstData.children).toHaveLength(1);
    expect(sunburstData.children[0].value).toBeGreaterThanOrEqual(1);
  });

  it('returns pieData with at least one slice', () => {
    const bundle = buildInsightsChartBundle({
      clients: [],
      invoices: [],
      proposals: [],
      industry: '',
    });
    expect(Array.isArray(bundle.pieData)).toBe(true);
    expect(bundle.pieData.length).toBeGreaterThanOrEqual(1);
    expect(bundle.pieData[0]).toMatchObject({
      name: expect.any(String),
      value: expect.any(Number),
      fill: expect.any(String),
    });
  });

  it('includes chartCopy with sunburst and matrix titles', () => {
    const bundle = buildInsightsChartBundle({
      clients: [],
      invoices: [],
      proposals: [],
      industry: '',
    });
    expect(bundle.chartCopy.sunburstTitle).toMatch(/Share/);
    expect(bundle.chartCopy.matrixTitle).toMatch(/Activity/i);
  });

  it('returns matrix rows, cols, and data with matching dimensions', () => {
    const bundle = buildInsightsChartBundle({
      clients: [],
      invoices: [],
      proposals: [],
      industry: '',
    });
    expect(bundle.matrixRows.length).toBeGreaterThan(0);
    expect(bundle.matrixCols.length).toBeGreaterThan(0);
    expect(bundle.matrixData.length).toBe(bundle.matrixRows.length);
    bundle.matrixData.forEach((row) => {
      expect(row.length).toBe(bundle.matrixCols.length);
    });
  });

  it('handles partially paid outstanding, client names, pipeline errors, scatter, and category leaderboard', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 5, 18, 14, 0, 0));

    const longName = `${'A'.repeat(50)}item`;
    const bundle = buildInsightsChartBundle({
      clients: [
        { id: 'c1', companyName: '', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
      ],
      invoices: [
        {
          client_id: 'c1',
          status: 'sent',
          total: '500',
          outstanding_balance: '120',
          date_issued: new Date(2025, 5, 10),
          paid_date: null,
        },
        {
          client_id: 'c1',
          status: 'partially_paid',
          total: '200',
          outstanding_balance: '50',
          paid_date: new Date(2025, 5, 12),
          date_issued: new Date(2025, 5, 1),
        },
        {
          client_id: 'c1',
          status: 'paid',
          total: '300',
          outstanding_balance: '0',
          date_issued: new Date(2025, 4, 1),
          paid_date: new Date(2025, 5, 3),
        },
        {
          client_id: 'c1',
          status: 'draft',
          total: '40',
          date_issued: new Date(2025, 5, 1),
          line_items: [
            { item_name: longName, amount: '10' },
            { description: '  ', quantity: '2', unit_price: '15' },
          ],
        },
      ],
      proposals: [
        { id: 'bad-chart-proposal', status: 'draft' },
        {
          id: 'okp',
          status: 'draft',
          line_items: [{ amount: '99' }],
          tax: 0,
          discount: 0,
        },
      ],
      industry: '  tech  ',
    });

    expect(bundle.pieData.length).toBeGreaterThan(0);
    expect(bundle.scatterData.some((p) => p.x >= 0 && p.y > 0)).toBe(true);
    expect(bundle.horizontalRank.length).toBeGreaterThan(0);
    expect(bundle.horizontalRank[0].v).toBeGreaterThanOrEqual(0);
    expect(bundle.treemapNodes.some((n) => String(n.name).includes('Ada'))).toBe(true);

    const emailOnly = buildInsightsChartBundle({
      clients: [{ id: 'e1', companyName: '', firstName: '', lastName: '', email: '  hi@example.com  ' }],
      invoices: [
        {
          client_id: 'e1',
          status: 'paid',
          total: '25',
          paid_date: new Date(2025, 5, 2),
        },
      ],
      proposals: [],
      industry: '',
    });
    expect(emailOnly.treemapNodes.some((n) => n.name === 'hi@example.com')).toBe(true);

    const paidInQuarter = bundle.composed.some((row) => row.rev > 0);
    expect(paidInQuarter).toBe(true);

    jest.useRealTimers();
  });

  it('increments matrix for a weekday invoice date', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 6, 1));
    const bundle = buildInsightsChartBundle({
      clients: [],
      invoices: [
        {
          status: 'paid',
          total: '10',
          paid_date: new Date(2025, 5, 4, 12, 0, 0),
          date_issued: new Date(2025, 5, 1),
        },
      ],
      proposals: [],
      industry: '',
    });
    const sum = bundle.matrixData.flat().reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(1);
    jest.useRealTimers();
  });
});
