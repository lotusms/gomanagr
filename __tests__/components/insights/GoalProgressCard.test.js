/**
 * Unit tests for GoalProgressCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalProgressCard from '@/components/insights/charts/GoalProgressCard';

jest.mock('@/components/insights/charts/AnimatedProgressBar', () => {
  return function MockAnimatedProgressBar({ label }) {
    return <div data-testid="progress-bar">{label}</div>;
  };
});

describe('GoalProgressCard', () => {
  it('renders custom bars', () => {
    const bars = [
      { label: 'Alpha', value: 40, colorClass: 'bg-red-500' },
      { label: 'Beta', value: 90, colorClass: 'bg-blue-500' },
    ];
    render(
      <GoalProgressCard title="Goals" subtitle="Progress" bars={bars} />
    );
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getAllByTestId('progress-bar')).toHaveLength(2);
  });

  it('uses default title, subtitle, and default bar labels', () => {
    render(<GoalProgressCard />);
    expect(screen.getByText('Goal Progress')).toBeInTheDocument();
    expect(screen.getByText('Animated bars')).toBeInTheDocument();
    expect(screen.getByText('Quarterly OKRs')).toBeInTheDocument();
    expect(screen.getAllByTestId('progress-bar')).toHaveLength(3);
  });
});
