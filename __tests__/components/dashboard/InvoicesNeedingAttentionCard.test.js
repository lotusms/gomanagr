/**
 * Unit tests for InvoicesNeedingAttentionCard
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import InvoicesNeedingAttentionCard from '@/components/dashboard/InvoicesNeedingAttentionCard';

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'invoice' ? 'Invoice' : t),
}));

describe('InvoicesNeedingAttentionCard', () => {
  it('renders heading', () => {
    render(<InvoicesNeedingAttentionCard />);
    expect(screen.getByText(/invoice.*needing attention/i)).toBeInTheDocument();
  });

  it('shows no overdue or upcoming message when all counts are 0', () => {
    render(<InvoicesNeedingAttentionCard />);
    expect(screen.getByText((content, el) => el?.tagName === 'P' && /No overdue or upcoming/.test(content) && /\.$/.test(content))).toBeInTheDocument();
  });

  it('shows StatBoxes when has attention', () => {
    render(
      <InvoicesNeedingAttentionCard
        overdueCount={2}
        overdueTotal={500}
        dueIn7DaysCount={1}
      />
    );
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Due in 7 days')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows Create invoice link', () => {
    render(<InvoicesNeedingAttentionCard />);
    const link = screen.getByRole('link', { name: /Create invoice/i });
    expect(link).toHaveAttribute('href', '/dashboard/invoices/new');
  });
});
