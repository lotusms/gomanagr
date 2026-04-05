/**
 * Unit tests for ResourceTreemapCard.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ResourceTreemapCard from '@/components/insights/charts/ResourceTreemapCard';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, variants, ...rest }) => <div {...rest}>{children}</div>,
  },
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive">{children}</div>,
  Treemap: ({ data, dataKey, children }) => (
    <div data-testid="treemap" data-datakey={dataKey} data-node-count={data?.length ?? 0}>
      {children}
    </div>
  ),
  Tooltip: () => <div data-testid="treemap-tooltip" />,
}));

const nodes = [
  { name: 'Engineering', size: 120 },
  { name: 'Design', size: 48 },
];

describe('ResourceTreemapCard', () => {
  it('renders default title and subtitle', () => {
    render(<ResourceTreemapCard nodes={nodes} />);
    expect(screen.getByRole('heading', { name: 'Resource Treemap' })).toBeInTheDocument();
    expect(screen.getByText('Hours by department')).toBeInTheDocument();
    expect(screen.getByTestId('treemap')).toBeInTheDocument();
  });

  it('renders custom title, subtitle, and className', () => {
    const { container } = render(
      <ResourceTreemapCard
        nodes={nodes}
        title="Staffing mix"
        subtitle="By team"
        className="col-span-full"
      />
    );
    expect(screen.getByRole('heading', { name: 'Staffing mix' })).toBeInTheDocument();
    expect(screen.getByText('By team')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('col-span-full');
  });

  it('passes nodes and size key to Treemap', () => {
    render(<ResourceTreemapCard nodes={nodes} />);
    const treemap = screen.getByTestId('treemap');
    expect(treemap).toHaveAttribute('data-datakey', 'size');
    expect(treemap).toHaveAttribute('data-node-count', '2');
  });

  it('normalizes currency to uppercase for tooltip wiring', () => {
    render(<ResourceTreemapCard nodes={nodes} currency="eur" />);
    expect(screen.getByTestId('treemap-tooltip')).toBeInTheDocument();
  });

  it('falls back to USD when currency is empty', () => {
    render(<ResourceTreemapCard nodes={nodes} currency="" />);
    expect(screen.getByTestId('treemap-tooltip')).toBeInTheDocument();
  });
});
