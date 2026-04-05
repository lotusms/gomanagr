/**
 * Unit tests for InsightsHeroKpis.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import InsightsHeroKpis from '@/components/insights/InsightsHeroKpis';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

describe('InsightsHeroKpis', () => {
  const kpis = {
    pipelineTotal: 1250.5,
    clientCount: 12,
    momPercent: 5.2,
    momLabel: 'vs last month (paid)',
    healthScore: 88,
    healthLabel: 'Paid vs issued (90d)',
  };

  it('shows skeleton placeholders when loading instead of values', () => {
    render(<InsightsHeroKpis loading currency="USD" kpis={kpis} />);
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('renders KPI values when not loading', () => {
    render(<InsightsHeroKpis loading={false} currency="USD" kpis={kpis} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('vs last month (paid)')).toBeInTheDocument();
    expect(screen.getByText('Paid vs issued (90d)')).toBeInTheDocument();
  });

  it('uses em dashes when kpis is null', () => {
    render(<InsightsHeroKpis loading={false} currency="USD" kpis={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('shows health as em dash when healthScore is null', () => {
    render(
      <InsightsHeroKpis
        loading={false}
        currency="USD"
        kpis={{ ...kpis, healthScore: null }}
      />
    );
    const healthTiles = screen.getAllByText('—');
    expect(healthTiles.length).toBeGreaterThanOrEqual(1);
  });

  it('uses default subtitles when momLabel and healthLabel are absent on kpis', () => {
    const { momLabel, healthLabel, ...rest } = kpis;
    render(<InsightsHeroKpis loading={false} currency="USD" kpis={rest} />);
    expect(screen.getByText('Paid revenue vs last month')).toBeInTheDocument();
    expect(screen.getByText('Collection health')).toBeInTheDocument();
  });
});
