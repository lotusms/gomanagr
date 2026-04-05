/**
 * Unit tests for LiveWeatherStreamCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import LiveWeatherStreamCard from '@/components/insights/charts/LiveWeatherStreamCard';

jest.mock('@/lib/insightsWeatherInterpolate', () => ({
  interpolateHourlyWeatherNow: jest.fn(() => ({ v: 72.3, w: 58 })),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, initial, transition, ...rest }) => <div {...rest}>{children}</div>,
    span: ({ children, animate, transition, ...rest }) => <span {...rest}>{children}</span>,
  },
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  /** Do not render children: they include SVG defs; rendering under a div breaks jsdom/React 19. */
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const points = [
  { label: 'Apr 1, 9 AM', v: 50, w: 60 },
  { label: 'Apr 1, 10 AM', v: 51, w: 61 },
];

describe('LiveWeatherStreamCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title with location hint when provided', () => {
    render(
      <LiveWeatherStreamCard
        livePoints={points}
        locationHint="  Springfield  "
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText(/Live Weather Forecast for Springfield/)).toBeInTheDocument();
  });

  it('renders generic title when location is empty', () => {
    render(<LiveWeatherStreamCard livePoints={points} loading={false} error={null} />);
    expect(screen.getByRole('heading', { name: 'Live Weather Forecast' })).toBeInTheDocument();
  });

  it('shows error message and hides chart when error is set', () => {
    render(
      <LiveWeatherStreamCard livePoints={points} loading={false} error="Weather unavailable" />
    );
    expect(screen.getByText('Weather unavailable')).toBeInTheDocument();
    const chartSection = screen.getByTestId('responsive').parentElement?.parentElement;
    expect(chartSection).toHaveClass('hidden');
  });

  it('renders area chart when no error', () => {
    render(<LiveWeatherStreamCard livePoints={points} loading={false} error={null} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('shows loading overlay when loading', () => {
    render(<LiveWeatherStreamCard livePoints={points} loading error={null} />);
    expect(screen.getByText('Loading weather…')).toBeInTheDocument();
  });

  it('renders attribution links', () => {
    render(<LiveWeatherStreamCard livePoints={points} loading={false} error={null} />);
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright'
    );
    expect(screen.getByRole('link', { name: 'Open-Meteo' })).toHaveAttribute('href', 'https://open-meteo.com/');
  });

  it('uses °C in metrics when primary label indicates Celsius', () => {
    render(
      <LiveWeatherStreamCard
        livePoints={points}
        loading={false}
        error={null}
        primaryLabel="Temperature (°C)"
      />
    );
    expect(screen.getByText('°C')).toBeInTheDocument();
  });
});
