/**
 * Unit tests for InsightsChartLegendContent and sortLegendPayloadByDataNames.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import InsightsChartLegendContent, {
  sortLegendPayloadByDataNames,
} from '@/components/insights/charts/InsightsChartLegendContent';

describe('sortLegendPayloadByDataNames', () => {
  const data = [{ name: 'Z' }, { name: 'A' }, { name: 'M' }];

  it('orders legend payload to match data[].name order', () => {
    const payload = [
      { value: 'M', color: '#ccc', payload: { name: 'M' } },
      { value: 'Z', color: '#aaa', payload: { name: 'Z' } },
      { value: 'A', color: '#bbb', payload: { name: 'A' } },
    ];
    const sorted = sortLegendPayloadByDataNames(payload, data);
    expect(sorted.map((p) => p.payload?.name ?? p.value)).toEqual(['Z', 'A', 'M']);
  });
});

describe('InsightsChartLegendContent', () => {
  const payloadTwo = [
    { value: 'Alpha', color: '#111', payload: { name: 'Alpha' } },
    { value: 'Beta', color: '#222', payload: { name: 'Beta' } },
  ];

  const payloadThree = [
    ...payloadTwo,
    { value: 'Gamma', color: '#333', payload: { name: 'Gamma' } },
  ];

  it('renders two-column grid when auto and more than two series', () => {
    const { container } = render(<InsightsChartLegendContent payload={payloadThree} layout="auto" />);
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('grid-cols-2');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('auto layout uses centered row when exactly two series', () => {
    const { container } = render(<InsightsChartLegendContent payload={payloadTwo} layout="auto" />);
    expect(container.querySelector('ul')).toHaveClass('justify-center');
  });

  it('renders centered row when layout is centered', () => {
    const { container } = render(<InsightsChartLegendContent payload={payloadTwo} layout="centered" />);
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('justify-center');
  });

  it('renders column stack for pie / sunburst side legend', () => {
    const { container } = render(<InsightsChartLegendContent payload={payloadTwo} layout="column" />);
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('flex-col');
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<InsightsChartLegendContent payload={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
