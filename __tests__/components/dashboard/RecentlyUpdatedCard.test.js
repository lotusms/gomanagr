/**
 * Unit tests for RecentlyUpdatedCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecentlyUpdatedCard from '@/components/dashboard/RecentlyUpdatedCard';

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

describe('RecentlyUpdatedCard', () => {
  it('renders Recently updated heading', () => {
    render(<RecentlyUpdatedCard items={[]} />);
    expect(screen.getByText('Recently updated')).toBeInTheDocument();
  });

  it('shows No recent activity yet when items is empty', () => {
    render(<RecentlyUpdatedCard items={[]} />);
    expect(screen.getByText('No recent activity yet.')).toBeInTheDocument();
  });

  it('renders item description and client name', () => {
    const items = [
      {
        id: '1',
        type: 'invoice',
        description: 'Invoice INV-001 marked paid',
        resourceId: 'inv-1',
        clientName: 'Acme Corp',
        updatedAt: new Date().toISOString(),
      },
    ];
    render(<RecentlyUpdatedCard items={items} />);
    expect(screen.getByText('Invoice INV-001 marked paid')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('invoice item link goes to invoices edit', () => {
    const items = [
      { id: '1', type: 'invoice', description: 'Paid', resourceId: 'inv-1', updatedAt: new Date().toISOString() },
    ];
    render(<RecentlyUpdatedCard items={items} />);
    const link = screen.getByRole('link', { name: 'Paid' });
    expect(link).toHaveAttribute('href', '/dashboard/invoices/inv-1/edit');
  });

  it('proposal item link goes to proposals edit', () => {
    const items = [
      { id: '2', type: 'proposal', description: 'Created', resourceId: 'prop-1', updatedAt: new Date().toISOString() },
    ];
    render(<RecentlyUpdatedCard items={items} />);
    const link = screen.getByRole('link', { name: 'Created' });
    expect(link).toHaveAttribute('href', '/dashboard/proposals/prop-1/edit');
  });

  it('shows pagination when more than 5 items', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      id: String(i),
      type: 'invoice',
      description: `Item ${i}`,
      resourceId: `inv-${i}`,
      updatedAt: new Date().toISOString(),
    }));
    render(<RecentlyUpdatedCard items={items} />);
    expect(screen.getByText(/1–5 of 7/)).toBeInTheDocument();
    const nextBtn = screen.getByRole('button', { name: /Next page/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/6–7 of 7/)).toBeInTheDocument();
  });
});
