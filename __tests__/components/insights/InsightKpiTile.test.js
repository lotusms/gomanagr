/**
 * Unit tests for InsightKpiTile.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import InsightKpiTile from '@/components/insights/InsightKpiTile';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

describe('InsightKpiTile', () => {
  const MockIcon = ({ className }) => <span data-testid="icon" className={className} />;

  it('renders label, subtitle, and icon when not loading', () => {
    render(<InsightKpiTile icon={MockIcon} label="$1.2k" subtitle="Pipeline" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('$1.2k')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('shows skeleton placeholders when loading', () => {
    const { container } = render(
      <InsightKpiTile icon={MockIcon} label="x" subtitle="y" loading />
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('x')).not.toBeInTheDocument();
  });

  it('renders without icon when icon omitted', () => {
    render(<InsightKpiTile label="42" subtitle="Count" />);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
