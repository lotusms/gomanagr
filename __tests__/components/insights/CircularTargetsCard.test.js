/**
 * Unit tests for CircularTargetsCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import CircularTargetsCard from '@/components/insights/charts/CircularTargetsCard';

jest.mock('@/components/insights/charts/AnimatedRing', () => {
  return function MockAnimatedRing({ label }) {
    return <div data-testid="animated-ring">{label}</div>;
  };
});

describe('CircularTargetsCard', () => {
  it('renders title, subtitle, and one ring per item', () => {
    const rings = [
      { value: 50, label: 'A', sub: 'a', stroke: '#000' },
      { value: 75, label: 'B', sub: 'b', stroke: '#111' },
    ];
    render(
      <CircularTargetsCard title="Targets" subtitle="Rings here" rings={rings} />
    );
    expect(screen.getByText('Targets')).toBeInTheDocument();
    expect(screen.getByText('Rings here')).toBeInTheDocument();
    const items = screen.getAllByTestId('animated-ring');
    expect(items).toHaveLength(2);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('uses default title and built-in default rings when props omitted', () => {
    render(<CircularTargetsCard />);
    expect(screen.getByText('Circular Targets')).toBeInTheDocument();
    expect(screen.getAllByTestId('animated-ring')).toHaveLength(3);
    expect(screen.getByText('CSAT')).toBeInTheDocument();
  });
});
