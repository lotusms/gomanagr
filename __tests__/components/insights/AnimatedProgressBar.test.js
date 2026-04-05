/**
 * Unit tests for AnimatedProgressBar.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AnimatedProgressBar from '@/components/insights/charts/AnimatedProgressBar';

jest.mock('framer-motion', () => {
  const motion = {
    div: ({ children, initial, whileInView, viewport, transition, ...rest }) => (
      <div data-testid="motion-bar" {...rest}>
        {children}
      </div>
    ),
  };
  return { motion };
});

describe('AnimatedProgressBar', () => {
  it('renders label and percentage from value/max', () => {
    render(
      <AnimatedProgressBar label="Revenue" value={25} max={100} colorClass="bg-blue-500" />
    );
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    const bar = screen.getByTestId('motion-bar');
    expect(bar).toHaveClass('bg-blue-500');
  });

  it('caps percentage at 100%', () => {
    render(<AnimatedProgressBar label="X" value={150} max={100} colorClass="bg-green-500" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
