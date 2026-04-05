/**
 * Unit tests for RevenueMixCard — side legend + pie.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import RevenueMixCard from '@/components/insights/charts/RevenueMixCard';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));

const sampleData = [
  { name: 'Collected', value: 100, fill: '#0ea5e9' },
  { name: 'Outstanding', value: 50, fill: '#6366f1' },
];

describe('RevenueMixCard', () => {
  it('renders title and legend labels beside the chart', () => {
    render(
      <RevenueMixCard data={sampleData} title="Invoice Mix" subtitle="By category" currency="USD" />
    );
    expect(screen.getByText('Invoice Mix')).toBeInTheDocument();
    expect(screen.getByText('By category')).toBeInTheDocument();
    expect(screen.getByText('Collected')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });
});
