/**
 * Unit tests for SparkTrendCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import SparkTrendCard from '@/components/insights/charts/SparkTrendCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  /** Avoid mounting SVG defs/gradients under jsdom. */
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
}));

const sparkData = [
  { v: 10 },
  { v: 14 },
  { v: 12 },
];

describe('SparkTrendCard', () => {
  it('renders default title and subtitle', () => {
    render(<SparkTrendCard data={sparkData} />);
    expect(screen.getByRole('heading', { name: 'Spark Trend' })).toBeInTheDocument();
    expect(screen.getByText('Mini area — last 12 periods')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('accepts custom title, subtitle, and className', () => {
    const { container } = render(
      <SparkTrendCard
        data={sparkData}
        title="Velocity"
        subtitle="Last 8 weeks"
        className="col-span-full"
      />
    );
    expect(screen.getByRole('heading', { name: 'Velocity' })).toBeInTheDocument();
    expect(screen.getByText('Last 8 weeks')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('col-span-full');
  });
});
