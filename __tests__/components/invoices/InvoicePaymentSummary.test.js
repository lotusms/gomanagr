/**
 * Unit tests for InvoicePaymentSummary:
 * - Renders total, amount paid, balance due, date paid
 * - Paid invoice shows "Email receipt" button; draft shows "Send invoice"
 * - Void action calls update-client-invoice with status void
 * - Payment history, correct balance, receipt dialog, send success, void error
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvoicePaymentSummary from '@/components/invoices/InvoicePaymentSummary';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/dashboard', push: jest.fn(), replace: jest.fn(), query: {} }),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => ({ dateFormat: 'MM/DD/YYYY', timezone: 'UTC' }),
}));

jest.mock('@/components/invoices/SendInvoiceDialog', () => function MockSendInvoiceDialog({ isOpen, onSuccess, onClose }) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-label="Send invoice">
      <button type="button" onClick={() => { onSuccess?.(); onClose?.(); }}>Complete send</button>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
});

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
    expect(screen.getByRole('button', { name: /send invoice/i })).toBeInTheDocument();
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

  it('on send success closes dialog and calls onInvoiceUpdated', () => {
    const onInvoiceUpdated = jest.fn();
    render(<InvoicePaymentSummary {...defaultProps} onInvoiceUpdated={onInvoiceUpdated} />);
    fireEvent.click(screen.getByRole('button', { name: /send invoice/i }));
    expect(screen.getByRole('dialog', { name: /send invoice/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /complete send/i }));
    expect(screen.queryByRole('dialog', { name: /send invoice/i })).not.toBeInTheDocument();
    expect(onInvoiceUpdated).toHaveBeenCalled();
  });

  it('void confirm on API error logs and does not close dialog', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    render(<InvoicePaymentSummary {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /void \/ refund/i }));
    const confirmInput = screen.getByPlaceholderText('void');
    fireEvent.change(confirmInput, { target: { value: 'void' } });
    fireEvent.click(screen.getByRole('button', { name: /void invoice/i }));
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    expect(screen.getByRole('dialog', { name: /void invoice/i })).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('payment history expand shows created, sent, paid, voided events', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{
          ...baseInvoice,
          status: 'void',
          ever_sent: true,
          date_sent: '2025-01-10T00:00:00Z',
          paid_date: '2025-01-12',
          created_at: '2025-01-01T00:00:00Z',
        }}
      />
    );
    expect(screen.getByText('Payment history')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Payment history'));
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Sent to client')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Voided')).toBeInTheDocument();
  });

  it('correct balance button opens dialog and apply success calls API and onInvoiceUpdated', async () => {
    const onInvoiceUpdated = jest.fn();
    global.fetch.mockResolvedValueOnce({ ok: true });
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        onInvoiceUpdated={onInvoiceUpdated}
        invoice={{
          ...baseInvoice,
          status: 'sent',
          ever_sent: true,
          outstanding_balance: '50',
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /correct balance due/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Correct balance due');
    const input = screen.getByLabelText(/balance due/i);
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/undo-invoice-payment',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"balanceDue":25'),
        })
      );
    });
    expect(onInvoiceUpdated).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('correct balance apply with value > total does not call API', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{ ...baseInvoice, status: 'sent', ever_sent: true, outstanding_balance: '50' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /correct balance due/i }));
    const input = screen.getByLabelText(/balance due/i);
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    expect(global.fetch).not.toHaveBeenCalledWith(
      '/api/undo-invoice-payment',
      expect.any(Object)
    );
  });

  it('correct balance apply API error sets console.error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Update failed' }),
    });
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{ ...baseInvoice, status: 'sent', ever_sent: true, outstanding_balance: '50' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /correct balance due/i }));
    fireEvent.change(screen.getByLabelText(/balance due/i), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }));
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('email receipt dialog opens with client email and empty validation', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{ ...baseInvoice, status: 'paid', paid_date: '2025-01-15', outstanding_balance: '0' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /email receipt/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Email receipt');
    const emailInput = screen.getByLabelText(/recipient email/i);
    expect(emailInput).toHaveValue('client@example.com');
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /send receipt/i }));
    expect(screen.getByText(/enter the recipient email address/i)).toBeInTheDocument();
  });

  it('email receipt invalid email shows validation error', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{ ...baseInvoice, status: 'paid', paid_date: '2025-01-15', outstanding_balance: '0' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /email receipt/i }));
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send receipt/i }));
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('email receipt send success closes dialog and calls onInvoiceUpdated', async () => {
    const onInvoiceUpdated = jest.fn();
    global.fetch.mockResolvedValueOnce({ ok: true });
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        onInvoiceUpdated={onInvoiceUpdated}
        invoice={{ ...baseInvoice, status: 'paid', paid_date: '2025-01-15', outstanding_balance: '0' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /email receipt/i }));
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'recipient@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send receipt/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/send-receipt-email',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"to":"recipient@example.com"'),
        })
      );
    });
    expect(onInvoiceUpdated).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('email receipt send API error shows error message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'SMTP failed' }),
    });
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{ ...baseInvoice, status: 'paid', paid_date: '2025-01-15', outstanding_balance: '0' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /email receipt/i }));
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'ok@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send receipt/i }));
    await waitFor(() => {
      expect(screen.getByText(/SMTP failed|failed to send receipt/i)).toBeInTheDocument();
    });
  });

  it('send reminder button opens send dialog when ever_sent', () => {
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
    expect(screen.getByRole('button', { name: /send reminder/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /send reminder/i }));
    expect(screen.getByRole('dialog', { name: /send invoice/i })).toBeInTheDocument();
  });

  it('renders without crash for status overdue', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{ ...baseInvoice, status: 'overdue' }}
      />
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders without crash for status partially_paid', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{
          ...baseInvoice,
          status: 'partially_paid',
          outstanding_balance: '40',
          paid_date: null,
        }}
      />
    );
    expect(screen.getByText('Amount paid')).toBeInTheDocument();
  });

  it('renders without crash for status void', () => {
    render(
      <InvoicePaymentSummary
        {...defaultProps}
        invoice={{ ...baseInvoice, status: 'void', outstanding_balance: '0' }}
      />
    );
    expect(screen.getByText('Balance due')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /void \/ refund/i })).not.toBeInTheDocument();
  });

  it('shows amount paid hint when amount paid is zero', () => {
    render(<InvoicePaymentSummary {...defaultProps} />);
    expect(screen.getByText(/updated when payment is recorded/i)).toBeInTheDocument();
  });

  it('shows date paid hint when paid_date is blank', () => {
    render(<InvoicePaymentSummary {...defaultProps} />);
    expect(screen.getByText(/blank until payment is recorded/i)).toBeInTheDocument();
  });
});
