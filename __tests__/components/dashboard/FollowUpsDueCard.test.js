/**
 * Unit tests for FollowUpsDueCard:
 * - Empty state with emptyMessage
 * - Renders items (clientName, reason, due date, overdue when days < 0)
 * - Log call / Send email / Mark done links (hrefs; Mark done invoice vs proposal)
 * - Pagination (Previous/Next, disabled, range text); page resets when items.length changes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FollowUpsDueCard from '@/components/dashboard/FollowUpsDueCard';

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }) {
    return <a href={href} {...rest}>{children}</a>;
  };
});

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDate: (dateStr, dateFormat, timezone) => `Formatted:${dateStr}`,
}));

jest.mock('react-icons/hi', () => ({
  HiPhone: () => <span data-testid="icon-phone" />,
  HiMail: () => <span data-testid="icon-mail" />,
  HiCheck: () => <span data-testid="icon-check" />,
  HiClipboardList: () => <span data-testid="icon-clipboard" />,
  HiChevronLeft: () => <span data-testid="icon-chevron-left" />,
  HiChevronRight: () => <span data-testid="icon-chevron-right" />,
}));

function makeItem(overrides = {}) {
  return {
    id: '1',
    clientId: 'client-1',
    clientName: 'Acme Corp',
    reason: 'Follow up on proposal',
    dueDate: '2025-06-15',
    days: 2,
    resourceId: 'res-1',
    type: 'proposal',
    ...overrides,
  };
}

describe('FollowUpsDueCard', () => {
  it('renders empty state with default emptyMessage', () => {
    render(<FollowUpsDueCard items={[]} />);
    expect(screen.getByRole('heading', { name: 'Follow-ups due' })).toBeInTheDocument();
    expect(screen.getByText('No follow-ups due')).toBeInTheDocument();
  });

  it('renders empty state with custom emptyMessage', () => {
    render(<FollowUpsDueCard items={[]} emptyMessage="Nothing due" />);
    expect(screen.getByText('Nothing due')).toBeInTheDocument();
  });

  it('renders item clientName, reason, and formatted due date', () => {
    const items = [makeItem({ clientName: 'Beta Inc', reason: 'Call back', dueDate: '2025-07-01' })];
    render(<FollowUpsDueCard items={items} />);
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    expect(screen.getByText('Call back')).toBeInTheDocument();
    expect(screen.getByText(/Formatted:2025-07-01/)).toBeInTheDocument();
  });

  it('shows (overdue) when item.days < 0', () => {
    const items = [makeItem({ days: -1 })];
    render(<FollowUpsDueCard items={items} />);
    expect(screen.getByText(/\(overdue\)/)).toBeInTheDocument();
  });

  it('does not show (overdue) when item.days >= 0', () => {
    const items = [makeItem({ days: 0 })];
    render(<FollowUpsDueCard items={items} />);
    expect(screen.queryByText(/\(overdue\)/)).not.toBeInTheDocument();
  });

  it('renders Log call link with correct href', () => {
    const items = [makeItem({ clientId: 'c-99' })];
    render(<FollowUpsDueCard items={items} />);
    const link = screen.getByRole('link', { name: 'Log call' });
    expect(link).toHaveAttribute('href', '/dashboard/clients/c-99/edit?tab=communication&section=calls');
  });

  it('renders Send email link with correct href', () => {
    const items = [makeItem({ clientId: 'c-99' })];
    render(<FollowUpsDueCard items={items} />);
    const link = screen.getByRole('link', { name: 'Send email' });
    expect(link).toHaveAttribute('href', '/dashboard/clients/c-99/edit?tab=communication');
  });

  it('renders Mark done link to invoice edit when item.type is invoice', () => {
    const items = [makeItem({ type: 'invoice', resourceId: 'inv-1' })];
    render(<FollowUpsDueCard items={items} />);
    const link = screen.getByRole('link', { name: 'Mark done' });
    expect(link).toHaveAttribute('href', '/dashboard/invoices/inv-1/edit');
  });

  it('renders Mark done link to proposal edit when item.type is not invoice', () => {
    const items = [makeItem({ type: 'proposal', resourceId: 'prop-1' })];
    render(<FollowUpsDueCard items={items} />);
    const link = screen.getByRole('link', { name: 'Mark done' });
    expect(link).toHaveAttribute('href', '/dashboard/proposals/prop-1/edit');
  });

  it('shows pagination when more than PAGE_SIZE items', () => {
    const items = Array.from({ length: 7 }, (_, i) => makeItem({ id: String(i), clientName: `Client ${i}` }));
    render(<FollowUpsDueCard items={items} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    expect(screen.getByText(/1–5 of 7/)).toBeInTheDocument();
  });

  it('does not show pagination when items length <= PAGE_SIZE', () => {
    const items = [makeItem(), makeItem({ id: '2', clientName: 'B' })];
    render(<FollowUpsDueCard items={items} />);
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('Previous is disabled on first page', () => {
    const items = Array.from({ length: 6 }, (_, i) => makeItem({ id: String(i) }));
    render(<FollowUpsDueCard items={items} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('Next is disabled on last page', async () => {
    const items = Array.from({ length: 6 }, (_, i) => makeItem({ id: String(i), clientName: `Client ${i}` }));
    render(<FollowUpsDueCard items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('navigates to next page and updates range text', async () => {
    const items = Array.from({ length: 7 }, (_, i) => makeItem({ id: String(i), clientName: `Client ${i}` }));
    render(<FollowUpsDueCard items={items} />);
    expect(screen.getByText(/1–5 of 7/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/6–7 of 7/)).toBeInTheDocument();
  });

  it('navigates to previous page after next', async () => {
    const items = Array.from({ length: 7 }, (_, i) => makeItem({ id: String(i), clientName: `Client ${i}` }));
    render(<FollowUpsDueCard items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/6–7 of 7/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText(/1–5 of 7/)).toBeInTheDocument();
  });

  it('resets to page 0 when items length changes', async () => {
    const sixItems = Array.from({ length: 6 }, (_, i) => makeItem({ id: String(i), clientName: `C${i}` }));
    const { rerender } = render(<FollowUpsDueCard items={sixItems} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/6–6 of 6/)).toBeInTheDocument();
    rerender(<FollowUpsDueCard items={[...sixItems, makeItem({ id: '6', clientName: 'C6' })]} />);
    expect(screen.getByText(/1–5 of 7/)).toBeInTheDocument();
  });
});
