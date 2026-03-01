/**
 * Unit tests for InvoiceLogCards:
 * - Renders a card per invoice with number, status, date, title, total
 * - Calls onSelect when card is clicked
 * - Calls onDelete when delete button is clicked
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceLogCards from '@/components/clients/add-client/InvoiceLogCards';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

describe('InvoiceLogCards', () => {
  const invoices = [
    {
      id: 'i1',
      invoice_number: 'INV-001',
      status: 'paid',
      date_issued: '2026-02-27',
      invoice_title: 'January Retainer',
      total: 2000,
      outstanding_balance: '',
    },
    {
      id: 'i2',
      invoice_number: 'INV-002',
      status: 'sent',
      date_issued: '2026-02-26',
      invoice_title: 'Project Fee',
      total: 5000,
      outstanding_balance: 5000,
    },
  ];

  it('renders a card per invoice with number, status, title, and total', () => {
    render(<InvoiceLogCards invoices={invoices} onSelect={() => {}} onDelete={() => {}} />);

    expect(screen.getByText('January Retainer')).toBeInTheDocument();
    expect(screen.getByText('Project Fee')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('INV-002')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText(/Total: \$2,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding: \$5,000\.00/)).toBeInTheDocument();
  });

  it('calls onSelect with invoice id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<InvoiceLogCards invoices={invoices} onSelect={onSelect} onDelete={() => {}} />);

    await userEvent.click(screen.getByText('January Retainer').closest('[role="button"]'));

    expect(onSelect).toHaveBeenCalledWith('i1');
  });

  it('calls onDelete with invoice id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<InvoiceLogCards invoices={invoices} onSelect={() => {}} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete invoice' });
    await userEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('i1');
  });
});
