/**
 * Unit tests for RegionalSunburstCard (Clients Share) — legend + sunburst.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import RegionalSunburstCard from '@/components/insights/charts/RegionalSunburstCard';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  SunburstChart: ({ children }) => <div data-testid="sunburst-chart">{children}</div>,
  Tooltip: () => null,
}));

const sampleData = {
  name: 'Clients',
  value: 200,
  children: [
    { name: 'Acme', value: 120, fill: '#0ea5e9' },
    { name: 'Beta', value: 80, fill: '#6366f1' },
  ],
};

describe('RegionalSunburstCard', () => {
  it('renders title and column legend for client segments', () => {
    render(
      <RegionalSunburstCard
        data={sampleData}
        title="Clients Share"
        subtitle="Collected revenue by client"
        currency="USD"
      />
    );
    expect(screen.getByText('Clients Share')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByTestId('sunburst-chart')).toBeInTheDocument();
  });
});
