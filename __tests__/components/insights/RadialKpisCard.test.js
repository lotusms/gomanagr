/**
 * Unit tests for RadialKpisCard (Workspace KPIs radial chart).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import RadialKpisCard from '@/components/insights/charts/RadialKpisCard';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  RadialBarChart: ({ children }) => <div data-testid="radial-bar-chart">{children}</div>,
  RadialBar: ({ children }) => <div data-testid="radial-bar">{children}</div>,
  Cell: () => null,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => null,
}));

const sampleData = [
  { name: 'Collection', value: 72, fill: '#0ea5e9' },
  { name: 'Pipeline', value: 45, fill: '#6366f1' },
];

describe('RadialKpisCard', () => {
  it('renders title, subtitle, and radial chart shell', () => {
    render(
      <RadialKpisCard data={sampleData} title="Workspace KPIs" subtitle="Collection and pipeline" />
    );
    expect(screen.getByText('Workspace KPIs')).toBeInTheDocument();
    expect(screen.getByText('Collection and pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('radial-bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('radial-bar')).toBeInTheDocument();
    expect(screen.getByTestId('responsive')).toBeInTheDocument();
  });

  it('uses default title and subtitle when omitted', () => {
    render(<RadialKpisCard data={sampleData} />);
    expect(screen.getByText('Radial KPIs')).toBeInTheDocument();
    expect(screen.getByText('Multi-segment rings')).toBeInTheDocument();
  });
});
