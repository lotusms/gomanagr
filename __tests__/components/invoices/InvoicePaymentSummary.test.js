/**
 * Unit tests for InvoicePaymentSummary:
 * - Renders total, amount paid, balance due, date paid
 * - Paid invoice shows "Email receipt" button; draft shows "Send invoice"
 * - Void action calls update-client-invoice with status void
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InvoicePaymentSummary from '@/components/invoices/InvoicePaymentSummary';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/dashboard', push: jest.fn(), replace: jest.fn(), query: {} }),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => ({ dateFormat: 'MM/DD/YYYY', timezone: 'UTC' }),
}));

describe('InvoicePaymentSummary', () => {
  const baseInvoice = {
    id: 'inv-1',
    total: '100',
    amount: '100',
    outstanding_balance: '',
    status: 'draft',
    paid_date: null,
    ever_sent: false,
    date_sent: null,
    created_at: '2025-01-01T00:00:00Z',
  };

  const defaultProps = {
    invoice: baseInvoice,
    userId: 'u1',
    clientEmail: 'client@example.com',
    clientName: 'Acme',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders total, amount paid, balance due, and date paid labels', () => {
    render(<InvoicePaymentSummary {...defaultProps} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Amount paid')).toBeInTheDocument();
    expect(screen.getByText('Balance due')).toBeInTheDocument();
    expect(screen.getByText('Date paid')).toBeInTheDocument();
  });

  it('shows "Send invoice" for draft invoice', () => {
    render(<InvoicePaymentSummary {...defaultProps} />);
    expect(screen.getByRole('button', { name: /send invoice/i })).toBeInTheDocument();
  });

  it('shows "Email receipt" for paid invoice', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{
          ...baseInvoice,
          status: 'paid',
          paid_date: '2025-01-15',
          outstanding_balance: '0',
        }}
      />
    );
    expect(screen.getByRole('button', { name: /email receipt/i })).toBeInTheDocument();
  });

  it('shows "Resend invoice" when ever_sent and not paid', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{
          ...baseInvoice,
          status: 'sent',
          ever_sent: true,
          date_sent: '2025-01-10',
        }}
      />
    );
    expect(screen.getByRole('button', { name: /resend invoice/i })).toBeInTheDocument();
  });

  it('void button opens confirmation and on confirm calls update-client-invoice', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true });
    render(<InvoicePaymentSummary {...defaultProps} />);
    const voidBtn = screen.getByRole('button', { name: /void \/ refund/i });
    expect(voidBtn).toBeInTheDocument();
    fireEvent.click(voidBtn);
    expect(screen.getByRole('dialog', { name: /void invoice/i })).toBeInTheDocument();
    const confirmInput = screen.getByPlaceholderText('void');
    fireEvent.change(confirmInput, { target: { value: 'void' } });
    const confirmBtn = screen.getByRole('button', { name: /void invoice/i });
    fireEvent.click(confirmBtn);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/update-client-invoice',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.userId).toBe('u1');
    expect(body.invoiceId).toBe('inv-1');
    expect(body.status).toBe('void');
    expect(body.outstanding_balance).toBe('0');
  });
});
