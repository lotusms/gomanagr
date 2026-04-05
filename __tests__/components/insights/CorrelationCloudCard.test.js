/**
 * Unit tests for CorrelationCloudCard (scatter / invoices pace).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import CorrelationCloudCard from '@/components/insights/charts/CorrelationCloudCard';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  ScatterChart: ({ children }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ZAxis: () => null,
  Tooltip: () => null,
}));

const scatterData = [
  { x: 7, y: 500, z: 500 },
  { x: 14, y: 1200, z: 1200 },
];

describe('CorrelationCloudCard', () => {
  it('renders title, subtitle, and scatter chart shell', () => {
    render(
      <CorrelationCloudCard
        data={scatterData}
        title="Invoices Pace"
        subtitle="Days vs amount"
        scatterName="Paid"
        currency="EUR"
      />
    );
    expect(screen.getByText('Invoices Pace')).toBeInTheDocument();
    expect(screen.getByText('Days vs amount')).toBeInTheDocument();
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
  });

  it('uses default title and subtitle', () => {
    render(<CorrelationCloudCard data={scatterData} />);
    expect(screen.getByText('Correlation Cloud')).toBeInTheDocument();
    expect(screen.getByText('Scatter + bubble size')).toBeInTheDocument();
  });
});
