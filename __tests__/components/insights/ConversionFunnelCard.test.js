/**
 * Unit tests for ConversionFunnelCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ConversionFunnelCard from '@/components/insights/charts/ConversionFunnelCard';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  FunnelChart: ({ children }) => <div data-testid="funnel-chart">{children}</div>,
  Funnel: ({ children }) => <div data-testid="funnel">{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
}));

const funnelData = [
  { name: 'All', value: 10, fill: '#0ea5e9' },
  { name: 'Won', value: 4, fill: '#10b981' },
];

describe('ConversionFunnelCard', () => {
  it('renders title, subtitle, and funnel chart shell', () => {
    render(
      <ConversionFunnelCard data={funnelData} title="Proposals funnel" subtitle="Stages" />
    );
    expect(screen.getByText('Proposals funnel')).toBeInTheDocument();
    expect(screen.getByText('Stages')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-chart')).toBeInTheDocument();
    expect(screen.getByTestId('funnel')).toBeInTheDocument();
  });

  it('uses default title and subtitle', () => {
    render(<ConversionFunnelCard data={funnelData} />);
    expect(screen.getByText('Conversion Funnel')).toBeInTheDocument();
    expect(screen.getByText('Stage drop-off')).toBeInTheDocument();
  });
});
