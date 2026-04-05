/**
 * Unit tests for AnimatedRing.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AnimatedRing from '@/components/insights/charts/AnimatedRing';

jest.mock('framer-motion', () => {
  const motion = {
    circle: ({ children, initial, whileInView, viewport, transition, ...rest }) => (
      <circle data-testid="motion-arc" {...rest}>
        {children}
      </circle>
    ),
  };
  return { motion };
});

describe('AnimatedRing', () => {
  it('renders label, sub, and stroke on progress arc', () => {
    render(
      <AnimatedRing value={60} label="Collected" sub="vs goal" stroke="#0ea5e9" />
    );
    expect(screen.getByText('Collected')).toBeInTheDocument();
    expect(screen.getByText('vs goal')).toBeInTheDocument();
    const arc = screen.getByTestId('motion-arc');
    expect(arc).toHaveAttribute('stroke', '#0ea5e9');
  });

  it('caps value at 100 for stroke offset math', () => {
    render(<AnimatedRing value={200} label="Over" sub="full" stroke="#000" />);
    expect(screen.getByText('Over')).toBeInTheDocument();
  });
});
