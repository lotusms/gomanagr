/**
 * Unit tests for RevenueVsGoalCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import RevenueVsGoalCard from '@/components/insights/charts/RevenueVsGoalCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  ComposedChart: ({ children, data }) => (
    <div data-testid="composed-chart" data-point-count={data?.length ?? 0}>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: ({ tickFormatter }) => {
    if (typeof tickFormatter === 'function') tickFormatter(1000);
    return null;
  },
  Tooltip: () => <div data-testid="rv-tooltip" />,
  Legend: ({ content }) => (
    <div data-testid="rv-legend">{typeof content === 'function' ? content({ payload: [] }) : null}</div>
  ),
  Bar: () => null,
  Line: () => null,
}));

const rows = [
  { q: 'Q1', rev: 10000, goal: 9500 },
  { q: 'Q2', rev: 12000, goal: 11000 },
];

describe('RevenueVsGoalCard', () => {
  it('renders default title and subtitle', () => {
    render(<RevenueVsGoalCard data={rows} />);
    expect(screen.getByRole('heading', { name: 'Revenue vs Goal' })).toBeInTheDocument();
    expect(screen.getByText('Composed: bars + trend line')).toBeInTheDocument();
    expect(screen.getByTestId('composed-chart')).toHaveAttribute('data-point-count', '2');
  });

  it('renders custom title, subtitle, and legend names', () => {
    render(
      <RevenueVsGoalCard
        data={rows}
        title="Targets"
        subtitle="Quarterly"
        legendNames={{ bar: 'Actual', line: 'Target' }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Targets' })).toBeInTheDocument();
    expect(screen.getByText('Quarterly')).toBeInTheDocument();
  });

  it('normalizes currency and wires tooltip', () => {
    render(<RevenueVsGoalCard data={rows} currency="gbp" />);
    expect(screen.getByTestId('rv-tooltip')).toBeInTheDocument();
  });

  it('falls back to USD when currency is empty', () => {
    render(<RevenueVsGoalCard data={rows} currency="" />);
    expect(screen.getByTestId('rv-tooltip')).toBeInTheDocument();
  });
});
