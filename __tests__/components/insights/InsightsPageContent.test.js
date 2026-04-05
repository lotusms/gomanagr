/**
 * Unit tests for InsightsPageContent (data wiring + layout; charts are stubbed).
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import InsightsPageContent from '@/components/insights/InsightsPageContent';

const mockUseAuth = jest.fn(() => ({ currentUser: { uid: 'user-1' } }));

jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockGetUserOrganization = jest.fn(() =>
  Promise.resolve({ id: 'org-1', industry: 'tech' })
);
const mockGetUserAccount = jest.fn(() =>
  Promise.resolve({ clientSettings: { defaultCurrency: 'CAD' } })
);

jest.mock('@/services/organizationService', () => ({
  getUserOrganization: (...args) => mockGetUserOrganization(...args),
}));

jest.mock('@/services/userService', () => ({
  getUserAccount: (...args) => mockGetUserAccount(...args),
}));

const mockComputeInsightKpis = jest.fn(() => ({
  pipelineTotal: 500,
  clientCount: 4,
  momPercent: 2.5,
  momLabel: 'vs last month (paid)',
  healthScore: 90,
  healthLabel: 'Paid vs issued (90d)',
}));

jest.mock('@/lib/insightsKpiAggregates', () => {
  const actual = jest.requireActual('@/lib/insightsKpiAggregates');
  return {
    ...actual,
    computeInsightKpis: (...args) => mockComputeInsightKpis(...args),
  };
});

const chartBundle = {
  chartCopy: {
    revenueMixTitle: 'Mix',
    revenueMixSubtitle: 'ms',
    teamRadarTitle: 'TR',
    teamRadarSubtitle: 'trs',
    funnelTitle: 'FT',
    funnelSubtitle: 'fs',
    radialTitle: 'RT',
    radialSubtitle: 'rs',
    treemapTitle: 'TT',
    treemapSubtitle: 'tts',
    scatterTitle: 'ST',
    scatterSubtitle: 'sts',
    sunburstTitle: 'SUT',
    sunburstSubtitle: 'suts',
    stackedTitle: 'SK',
    stackedSubtitle: 'sks',
    revenueGoalTitle: 'RG',
    revenueGoalSubtitle: 'rgs',
    categoryTitle: 'CT',
    categorySubtitle: 'cts',
    matrixTitle: 'MT',
    matrixSubtitle: 'mts',
    goalProgressTitle: 'GT',
    goalProgressSubtitle: 'gts',
    circularTitle: 'CIT',
    circularSubtitle: 'cits',
    sparkTitle: 'SPT',
    sparkSubtitle: 'spts',
  },
  terms: { invoice: 'Invoices', client: 'Clients', proposal: 'Proposals', services: 'Services', team: 'Team' },
  pieData: [{ name: 'a', value: 1, fill: '#000' }],
  radarData: [{ subject: 's', A: 1, B: 2, fullMark: 100 }],
  radarSeriesA: 'A',
  radarSeriesB: 'B',
  funnelData: [],
  radialData: [],
  treemapNodes: [],
  scatterData: [{ x: 0, y: 1, z: 1 }],
  sunburstData: { name: 'root', value: 1, children: [] },
  stacked: [{ m: 'Jan', a: 1, b: 0, c: 0 }],
  composed: [{ q: 'Q1 25', rev: 1, goal: 1 }],
  horizontalRank: [{ name: 'x', v: 50 }],
  matrixRows: ['Mon'],
  matrixCols: ['W1'],
  matrixData: [[0]],
  goalProgress: { bars: [{ label: 'a', value: 1, colorClass: 'x' }] },
  circularTargets: { rings: [{ value: 1, label: 'l', sub: 's', stroke: '#000' }] },
  sparkData: [{ i: 0, v: 1 }],
  stackLegend: { a: 'a', b: 'b', c: 'c' },
  revenueGoalLegend: { bar: 'b', line: 'l' },
};

jest.mock('@/lib/insightsChartData', () => ({
  buildInsightsChartBundle: jest.fn(() => chartBundle),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, variants, initial, animate, ...rest }) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

jest.mock('@/components/insights/charts', () => {
  const React = require('react');
  const ChartStub = (props) => (
    <div data-testid="insight-chart" data-title={props.title} data-subtitle={props.subtitle}>
      {props.locationHint != null ? <span>{props.locationHint}</span> : null}
      {props.error != null ? <span data-testid="chart-stream-error">{props.error}</span> : null}
    </div>
  );
  return {
    containerVariants: {},
    itemVariants: {},
    LiveWeatherStreamCard: ChartStub,
    RevenueMixCard: ChartStub,
    TeamRadarCard: ChartStub,
    ConversionFunnelCard: ChartStub,
    RadialKpisCard: ChartStub,
    ResourceTreemapCard: ChartStub,
    CorrelationCloudCard: ChartStub,
    RegionalSunburstCard: ChartStub,
    StackedPerformanceCard: ChartStub,
    RevenueVsGoalCard: ChartStub,
    CategoryLeaderboardCard: ChartStub,
    ActivityMatrixCard: ChartStub,
    GoalProgressCard: ChartStub,
    CircularTargetsCard: ChartStub,
    SparkTrendCard: ChartStub,
  };
});

describe('InsightsPageContent', () => {
  let setIntervalSpy;
  let clearIntervalSpy;

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ currentUser: { uid: 'user-1' } });
    mockGetUserOrganization.mockImplementation(() =>
      Promise.resolve({ id: 'org-1', industry: 'tech' })
    );
    mockGetUserAccount.mockImplementation(() =>
      Promise.resolve({ clientSettings: { defaultCurrency: 'CAD' } })
    );
    mockComputeInsightKpis.mockClear();
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.includes('/api/get-org-clients')) {
        return Promise.resolve({ json: async () => ({ clients: [{ id: 'c1' }] }) });
      }
      if (u.includes('/api/get-invoices')) {
        return Promise.resolve({ json: async () => ({ invoices: [] }) });
      }
      if (u.includes('/api/get-proposals')) {
        return Promise.resolve({ json: async () => ({ proposals: [] }) });
      }
      if (u.includes('/api/insights/reverse-geocode')) {
        return Promise.resolve({ ok: true, json: async () => ({ label: 'Test City' }) });
      }
      if (u.includes('/api/insights/weather-stream')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            points: [{ t: 0, isoTime: '2025-01-01T00:00:00.000Z', v: 1, w: 2, label: 'x' }],
            meta: {
              series: {
                v: { label: 'Temperature (°F)' },
                w: { label: 'Humidity (% RH)' },
              },
            },
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    delete global.navigator.geolocation;
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(42);
    clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('renders heading and chart grid after data loads', async () => {
    const { buildInsightsChartBundle } = require('@/lib/insightsChartData');
    render(<InsightsPageContent />);
    expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByTestId('insight-chart').length).toBe(15);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/get-org-clients',
      expect.objectContaining({ method: 'POST' })
    );
    await waitFor(() => {
      expect(buildInsightsChartBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: 'tech',
          clients: expect.arrayContaining([{ id: 'c1' }]),
        })
      );
    });
  });

  it('skips KPI fetch when there is no signed-in user', async () => {
    mockUseAuth.mockReturnValue({ currentUser: null });
    global.fetch.mockClear();
    render(<InsightsPageContent />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/get-org-clients', expect.anything());
  });

  it('continues when organization or account service rejects', async () => {
    mockGetUserOrganization.mockRejectedValueOnce(new Error('org'));
    mockGetUserAccount.mockRejectedValueOnce(new Error('acct'));
    render(<InsightsPageContent />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
    });
  });

  it('clears KPI snapshot when entity fetch fails', async () => {
    global.fetch.mockImplementation(() => Promise.reject(new Error('network')));
    render(<InsightsPageContent />);
    await waitFor(() => {
      expect(mockComputeInsightKpis).not.toHaveBeenCalled();
    });
  });

  it('uses coordinate fallback when reverse geocode fetch throws', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('reverse-geocode')) return Promise.reject(new Error('offline'));
      if (u.includes('get-org-clients')) {
        return Promise.resolve({ json: async () => ({ clients: [] }) });
      }
      if (u.includes('get-invoices')) {
        return Promise.resolve({ json: async () => ({ invoices: [] }) });
      }
      if (u.includes('get-proposals')) {
        return Promise.resolve({ json: async () => ({ proposals: [] }) });
      }
      if (u.includes('weather-stream')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            points: [{ t: 0, isoTime: '2025-01-01T00:00:00.000Z', v: 1, w: 2, label: 'x' }],
            meta: { series: { v: { label: 'T' }, w: { label: 'H' } } },
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    render(<InsightsPageContent />);
    await waitFor(() => {
      expect(screen.getByText(/Near 40\.71/)).toBeInTheDocument();
    });
  });

  it('applies browser geolocation when available', async () => {
    const geo = {
      getCurrentPosition: jest.fn((success) => {
        success({ coords: { latitude: 51.5, longitude: -0.12 } });
      }),
    };
    Object.defineProperty(global.navigator, 'geolocation', { value: geo, configurable: true });
    render(<InsightsPageContent />);
    await waitFor(() => {
      expect(geo.getCurrentPosition).toHaveBeenCalled();
    });
    delete global.navigator.geolocation;
  });

  it('sets stream error when initial weather fetch fails', async () => {
    global.fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes('weather-stream')) {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'bad' }) });
      }
      if (u.includes('get-org-clients')) {
        return Promise.resolve({ json: async () => ({ clients: [] }) });
      }
      if (u.includes('get-invoices')) {
        return Promise.resolve({ json: async () => ({ invoices: [] }) });
      }
      if (u.includes('get-proposals')) {
        return Promise.resolve({ json: async () => ({ proposals: [] }) });
      }
      if (u.includes('reverse-geocode')) {
        return Promise.resolve({ ok: true, json: async () => ({ label: 'X' }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    render(<InsightsPageContent />);
    await waitFor(() => {
      expect(screen.getByTestId('chart-stream-error')).toHaveTextContent('bad');
    });
  });
});
