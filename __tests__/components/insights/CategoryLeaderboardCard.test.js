/**
 * Unit tests for CategoryLeaderboardCard (horizontal bar chart).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import CategoryLeaderboardCard from '@/components/insights/charts/CategoryLeaderboardCard';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

const sampleData = [
  { name: 'Design', v: 120 },
  { name: 'Dev', v: 80 },
];

describe('CategoryLeaderboardCard', () => {
  it('renders title, subtitle, and vertical bar chart', () => {
    render(
      <CategoryLeaderboardCard
        data={sampleData}
        title="Services Mix"
        subtitle="Top line items"
        barSeriesName="Amount"
      />
    );
    expect(screen.getByText('Services Mix')).toBeInTheDocument();
    expect(screen.getByText('Top line items')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive')).toBeInTheDocument();
  });

  it('uses default title and subtitle', () => {
    render(<CategoryLeaderboardCard data={sampleData} />);
    expect(screen.getByText('Category Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Horizontal bars — ranking')).toBeInTheDocument();
  });
});
