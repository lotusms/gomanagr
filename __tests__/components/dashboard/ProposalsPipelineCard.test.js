/**
 * Unit tests for ProposalsPipelineCard
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProposalsPipelineCard from '@/components/dashboard/ProposalsPipelineCard';

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'proposal' ? 'Proposal' : t),
}));

// Recharts ResponsiveContainer needs width/height; in jsdom we mock it
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: () => <div data-testid="bar-chart">BarChart</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Cell: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

describe('ProposalsPipelineCard', () => {
  it('renders pipeline heading', () => {
    render(<ProposalsPipelineCard />);
    expect(screen.getByText(/proposal.*pipeline/i)).toBeInTheDocument();
  });

  it('shows No proposal yet when counts empty', () => {
    render(<ProposalsPipelineCard counts={{}} />);
    expect(screen.getByText((content, el) => el?.tagName === 'P' && content.includes('No') && content.includes('proposal') && content.includes('yet'))).toBeInTheDocument();
  });

  it('shows Create proposal link', () => {
    render(<ProposalsPipelineCard />);
    const link = screen.getByRole('link', { name: /Create proposal/i });
    expect(link).toHaveAttribute('href', '/dashboard/proposals/new');
  });

  it('renders chart when counts have values', () => {
    render(<ProposalsPipelineCard counts={{ draft: 2, sent: 1 }} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
