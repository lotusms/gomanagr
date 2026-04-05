/**
 * Unit tests for StackedPerformanceCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import StackedPerformanceCard from '@/components/insights/charts/StackedPerformanceCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart" data-point-count={data?.length ?? 0}>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: ({ tickFormatter }) => {
    if (typeof tickFormatter === 'function') tickFormatter(1000);
    return null;
  },
  Tooltip: () => <div data-testid="sp-tooltip" />,
  Legend: ({ content }) => (
    <div data-testid="sp-legend">{typeof content === 'function' ? content({ payload: [] }) : null}</div>
  ),
  Bar: () => null,
}));

const rows = [
  { m: 'Jan', a: 100, b: 50, c: 25 },
  { m: 'Feb', a: 110, b: 55, c: 30 },
];

describe('StackedPerformanceCard', () => {
  it('renders default title and subtitle', () => {
    render(<StackedPerformanceCard data={rows} />);
    expect(screen.getByRole('heading', { name: 'Stacked Performance' })).toBeInTheDocument();
    expect(screen.getByText('Multi-series bars')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-point-count', '2');
  });

  it('renders custom stack legend labels', () => {
    render(
      <StackedPerformanceCard
        data={rows}
        title="Mix"
        subtitle="By month"
        stackLegend={{ a: 'Alpha', b: 'Beta', c: 'Gamma' }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Mix' })).toBeInTheDocument();
    expect(screen.getByText('By month')).toBeInTheDocument();
  });

  it('normalizes currency and wires tooltip', () => {
    render(<StackedPerformanceCard data={rows} currency="cad" />);
    expect(screen.getByTestId('sp-tooltip')).toBeInTheDocument();
  });

  it('falls back to USD when currency is empty', () => {
    render(<StackedPerformanceCard data={rows} currency="" />);
    expect(screen.getByTestId('sp-tooltip')).toBeInTheDocument();
  });
});
