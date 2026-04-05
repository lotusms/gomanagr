/**
 * Unit tests for TeamRadarCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TeamRadarCard from '@/components/insights/charts/TeamRadarCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  RadarChart: ({ children, data }) => (
    <div data-testid="radar-chart" data-point-count={data?.length ?? 0}>
      {children}
    </div>
  ),
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  Radar: () => null,
  Legend: ({ content }) => (
    <div data-testid="radar-legend">{typeof content === 'function' ? content({ payload: [] }) : null}</div>
  ),
  Tooltip: () => <div data-testid="radar-tooltip" />,
}));

const radarRows = [
  { subject: 'Speed', A: 80, B: 70 },
  { subject: 'Quality', A: 90, B: 85 },
];

describe('TeamRadarCard', () => {
  it('renders default title and subtitle', () => {
    render(<TeamRadarCard data={radarRows} />);
    expect(screen.getByRole('heading', { name: 'Team Radar' })).toBeInTheDocument();
    expect(screen.getByText('Performance vs benchmark')).toBeInTheDocument();
    expect(screen.getByTestId('radar-chart')).toHaveAttribute('data-point-count', '2');
  });

  it('renders custom series names and copy', () => {
    render(
      <TeamRadarCard
        data={radarRows}
        title="Squad comparison"
        subtitle="This quarter"
        seriesA="Now"
        seriesB="Last year"
      />
    );
    expect(screen.getByRole('heading', { name: 'Squad comparison' })).toBeInTheDocument();
    expect(screen.getByText('This quarter')).toBeInTheDocument();
    expect(screen.getByTestId('radar-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('radar-legend')).toBeInTheDocument();
  });
});
