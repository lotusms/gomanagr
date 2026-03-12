/**
 * Unit tests for InvoiceCardServiceStyle (dashboard invoice card)
 * - Render: title, totals, client, status, menu, dialogs
 * - Menu: open/close on outside click; Send, Reminder, Void, View, Print
 * - handleSendSuccess, handleVoidConfirm (fetch mock)
 * - Header by status; keyDown; delete button
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceCardServiceStyle from '@/components/dashboard/InvoiceCardServiceStyle';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/dashboard/invoices', push: jest.fn() }),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => ({ dateFormat: 'MM/DD/YYYY', timezone: 'UTC' }),
}));

jest.mock('@/lib/buildDocumentPayload', () => ({
  buildInvoiceDocumentPayload: () => ({}),
  buildCompanyForDocument: () => ({ name: 'Company' }),
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (iso) => (iso ? `Formatted:${iso}` : ''),
}));

jest.mock('@/utils/formatCurrency', () => ({
  formatCurrency: (n, code) => `${n.toFixed(2)} ${code}`,
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'invoice' ? 'Invoice' : t),
}));

jest.mock('@/components/documents', () => ({
  DocumentViewDialog: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="document-view-dialog">
        <button type="button" onClick={onClose}>Close view</button>
      </div>
    ) : null,
}));

jest.mock('@/components/invoices/SendInvoiceDialog', () => function MockSendInvoiceDialog({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;
  return (
    <div data-testid="send-invoice-dialog">
      <button type="button" onClick={onClose}>Close send</button>
      <button type="button" onClick={onSuccess}>Simulate success</button>
    </div>
  );
});

jest.mock('@/components/ui/ConfirmationDialog', () => function MockConfirmationDialog({ isOpen, onClose, onConfirm, title }) {
  if (!isOpen) return null;
  return (
    <div data-testid="confirmation-dialog" aria-label={title}>
      <button type="button" onClick={onClose}>Cancel</button>
      <button type="button" onClick={onConfirm}>Confirm</button>
    </div>
  );
});

describe('InvoiceCardServiceStyle', () => {
  const defaultInvoice = {
    id: 'inv-1',
    client_id: 'c1',
    invoice_number: 'INV-001',
    invoice_title: 'Test Invoice',
    total: '100',
    amount: '100',
    status: 'draft',
    outstanding_balance: '',
    paid_date: null,
    ever_sent: false,
  };

  const defaultProps = {
    invoice: defaultInvoice,
    onSelect: jest.fn(),
    onDelete: jest.fn(),
    onInvoiceUpdated: jest.fn(),
    clientNameByClientId: { c1: 'Acme Corp' },
    clientEmailByClientId: { c1: 'acme@example.com' },
  };

  beforeEach(() => {
    defaultProps.onSelect.mockClear();
    defaultProps.onDelete.mockClear();
    defaultProps.onInvoiceUpdated.mockClear();
    global.fetch = jest.fn();
  });

  it('renders invoice title or untitled label', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    expect(screen.getByText('Test Invoice')).toBeInTheDocument();
  });

  it('renders total and balance due amount', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    expect(screen.getByText(/Total:.*100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Balance due:.*100\.00/)).toBeInTheDocument();
  });

  it('renders client name when provided', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders Draft status for draft invoice', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    screen.getByRole('button', { name: /test invoice/i }).click();
    expect(defaultProps.onSelect).toHaveBeenCalledWith('inv-1');
  });

  it('calls onDelete when delete button is clicked', async () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    const deleteBtn = screen.getByTitle('Delete invoice');
    await userEvent.click(deleteBtn);
    expect(defaultProps.onDelete).toHaveBeenCalledWith('inv-1');
  });

  it('calls onSelect on Enter key on header', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    const header = screen.getByRole('button', { name: /test invoice/i });
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('inv-1');
  });

  it('renders Sent status for sent invoice', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} invoice={{ ...defaultInvoice, status: 'sent' }} />);
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('renders Overdue status for overdue invoice', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} invoice={{ ...defaultInvoice, status: 'overdue' }} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('renders amount paid and balance when outstanding_balance set', () => {
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        invoice={{ ...defaultInvoice, total: '100', outstanding_balance: '40' }}
      />
    );
    expect(screen.getByText(/Amount paid:.*60\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Balance due:.*40\.00/)).toBeInTheDocument();
  });

  it('renders paid date when paid_date set', () => {
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        invoice={{ ...defaultInvoice, paid_date: '2025-06-01T00:00:00Z' }}
      />
    );
    expect(screen.getByText(/Formatted:2025-06-01/)).toBeInTheDocument();
  });

  it('renders No amount when total and balance are zero', () => {
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        invoice={{ ...defaultInvoice, total: '0', amount: '0', outstanding_balance: '0' }}
      />
    );
    expect(screen.getByText('No amount')).toBeInTheDocument();
  });

  it('opens menu and shows Send invoice then opens SendInvoiceDialog', async () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    const moreBtn = screen.getByTitle('More actions');
    await userEvent.click(moreBtn);
    const sendItem = screen.getByRole('menuitem', { name: /Send invoice/i });
    await userEvent.click(sendItem);
    expect(screen.getByTestId('send-invoice-dialog')).toBeInTheDocument();
  });

  it('shows Send reminder when ever_sent and opens dialog as reminder', async () => {
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        invoice={{ ...defaultInvoice, ever_sent: true }}
      />
    );
    await userEvent.click(screen.getByTitle('More actions'));
    expect(screen.getByRole('menuitem', { name: /Send reminder/i })).toBeInTheDocument();
  });

  it('handleSendSuccess closes send dialog and calls onInvoiceUpdated', async () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    await userEvent.click(screen.getByTitle('More actions'));
    await userEvent.click(screen.getByRole('menuitem', { name: /Send invoice/i }));
    await userEvent.click(screen.getByText('Simulate success'));
    expect(screen.queryByTestId('send-invoice-dialog')).not.toBeInTheDocument();
    expect(defaultProps.onInvoiceUpdated).toHaveBeenCalled();
  });

  it('opens Void dialog from menu and handleVoidConfirm calls fetch and onInvoiceUpdated', async () => {
    global.fetch.mockResolvedValue({ ok: true });
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        userId="u1"
        organization={{ id: 'org1' }}
      />
    );
    await userEvent.click(screen.getByTitle('More actions'));
    await userEvent.click(screen.getByRole('menuitem', { name: /Void \/ Refund/i }));
    expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/update-client-invoice',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          userId: 'u1',
          invoiceId: 'inv-1',
          organizationId: 'org1',
          status: 'void',
          outstanding_balance: '0',
        }),
      })
    );
    await waitFor(() => {
      expect(defaultProps.onInvoiceUpdated).toHaveBeenCalled();
    });
  });

  it('opens View invoice from menu and shows DocumentViewDialog', async () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    await userEvent.click(screen.getByTitle('More actions'));
    await userEvent.click(screen.getByRole('menuitem', { name: /View invoice/i }));
    expect(screen.getByTestId('document-view-dialog')).toBeInTheDocument();
  });

  it('opens Print invoice from menu', async () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    await userEvent.click(screen.getByTitle('More actions'));
    await userEvent.click(screen.getByRole('menuitem', { name: /Print invoice/i }));
    expect(screen.getByTestId('document-view-dialog')).toBeInTheDocument();
  });

  it('menu closes when clicking outside', async () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    await userEvent.click(screen.getByTitle('More actions'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders invoice_number and date_issued when present', () => {
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        invoice={{ ...defaultInvoice, date_issued: '2025-06-15T00:00:00Z' }}
      />
    );
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText(/Formatted:2025-06-15/)).toBeInTheDocument();
  });

  it('renders Untitled invoice when invoice_title missing', () => {
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        invoice={{ ...defaultInvoice, invoice_title: '' }}
      />
    );
    expect(screen.getByText('Untitled invoice')).toBeInTheDocument();
  });

  it('calls onSelect on Space key on content area', () => {
    render(<InvoiceCardServiceStyle {...defaultProps} />);
    const totalEl = screen.getByText(/Total:.*100\.00/);
    const contentArea = totalEl.closest('[role="button"]');
    expect(contentArea).toBeTruthy();
    fireEvent.keyDown(contentArea, { key: ' ' });
    expect(defaultProps.onSelect).toHaveBeenCalledWith('inv-1');
  });

  it('handleVoidConfirm does not call fetch when userId missing', async () => {
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        organization={{ id: 'org1' }}
      />
    );
    await userEvent.click(screen.getByTitle('More actions'));
    await userEvent.click(screen.getByRole('menuitem', { name: /Void \/ Refund/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handleVoidConfirm on API error keeps void dialog open', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <InvoiceCardServiceStyle
        {...defaultProps}
        userId="u1"
        organization={{ id: 'org1' }}
      />
    );
    await userEvent.click(screen.getByTitle('More actions'));
    await userEvent.click(screen.getByRole('menuitem', { name: /Void \/ Refund/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
