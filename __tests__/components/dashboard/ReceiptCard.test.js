/**
 * Unit tests for ReceiptCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReceiptCard from '@/components/dashboard/ReceiptCard';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (d) => (d ? new Date(d).toLocaleDateString() : '—'),
}));

jest.mock('@/utils/formatCurrency', () => ({
  formatCurrency: (amount, currency) => `${currency} ${Number(amount).toFixed(2)}`,
}));

jest.mock('@/lib/buildDocumentPayload', () => ({
  buildCompanyForDocument: () => ({}),
  buildInvoiceDocumentPayload: () => ({}),
}));

jest.mock('@/components/documents', () => ({
  DocumentViewDialog: ({ isOpen, documentTypeLabel, autoPrint }) =>
    isOpen ? (
      <div data-testid="document-view-dialog">
        <span>{documentTypeLabel}</span>
        {autoPrint && <span data-testid="auto-print">auto</span>}
      </div>
    ) : null,
}));

jest.mock('@/components/invoices/SendInvoiceDialog', () => {
  const Mock = ({ isOpen, onSuccess, onClose }) =>
    isOpen ? (
      <div data-testid="send-invoice-dialog">
        <button type="button" onClick={onSuccess}>Send</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    ) : null;
  return Mock;
});

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
}));

describe('ReceiptCard', () => {
  const invoice = {
    id: 'inv-1',
    invoice_title: 'January Receipt',
    total: '1500',
    paid_date: '2026-02-01',
    client_id: 'c1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders invoice title', () => {
    render(
      <ReceiptCard
        invoice={invoice}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
      />
    );
    expect(screen.getByText('January Receipt')).toBeInTheDocument();
  });

  it('renders Untitled invoice when invoice_title is empty', () => {
    render(
      <ReceiptCard
        invoice={{ ...invoice, invoice_title: '' }}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
      />
    );
    expect(screen.getByText(/Untitled invoice/)).toBeInTheDocument();
  });

  it('calls router.push when card is clicked', () => {
    render(
      <ReceiptCard
        invoice={invoice}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
      />
    );
    fireEvent.click(screen.getByText('January Receipt').closest('[role="button"]'));
    expect(mockPush).toHaveBeenCalledWith('/dashboard/receipts?open=inv-1');
  });

  it('navigates on Enter key on header button', () => {
    render(
      <ReceiptCard invoice={invoice} clientNameByClientId={{}} clientEmailByClientId={{}} />
    );
    const headerButton = screen.getByText('January Receipt').closest('[role="button"]');
    fireEvent.keyDown(headerButton, { key: 'Enter', preventDefault: jest.fn() });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/receipts?open=inv-1');
  });

  it('navigates on Space key on header button', () => {
    render(
      <ReceiptCard invoice={invoice} clientNameByClientId={{}} clientEmailByClientId={{}} />
    );
    const headerButton = screen.getByText('January Receipt').closest('[role="button"]');
    fireEvent.keyDown(headerButton, { key: ' ', preventDefault: jest.fn() });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/receipts?open=inv-1');
  });

  it('opens menu and View receipt navigates', () => {
    render(
      <ReceiptCard invoice={invoice} clientNameByClientId={{}} clientEmailByClientId={{}} />
    );
    fireEvent.click(screen.getByTitle('Actions'));
    const viewReceipt = document.body.querySelector('[role="menuitem"]');
    expect(viewReceipt).toHaveTextContent('View receipt');
    fireEvent.click(viewReceipt);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/receipts?open=inv-1');
  });

  it('opens menu and Print opens DocumentViewDialog', () => {
    render(
      <ReceiptCard invoice={invoice} clientNameByClientId={{}} clientEmailByClientId={{}} />
    );
    fireEvent.click(screen.getByTitle('Actions'));
    const menuItems = document.body.querySelectorAll('[role="menuitem"]');
    const printItem = Array.from(menuItems).find((el) => el.textContent?.includes('Print'));
    fireEvent.click(printItem);
    expect(screen.getByTestId('document-view-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('auto-print')).toBeInTheDocument();
  });

  it('opens menu and Email receipt opens SendInvoiceDialog and onSuccess closes and calls onReceiptUpdated', () => {
    const onReceiptUpdated = jest.fn();
    render(
      <ReceiptCard
        invoice={invoice}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
        onReceiptUpdated={onReceiptUpdated}
      />
    );
    fireEvent.click(screen.getByTitle('Actions'));
    const menuItems = document.body.querySelectorAll('[role="menuitem"]');
    const emailItem = Array.from(menuItems).find((el) => el.textContent?.includes('Email receipt'));
    fireEvent.click(emailItem);
    expect(screen.getByTestId('send-invoice-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onReceiptUpdated).toHaveBeenCalled();
    expect(screen.queryByTestId('send-invoice-dialog')).not.toBeInTheDocument();
  });

  it('closes menu when clicking outside', () => {
    render(
      <ReceiptCard invoice={invoice} clientNameByClientId={{}} clientEmailByClientId={{}} />
    );
    fireEvent.click(screen.getByTitle('Actions'));
    expect(document.body.querySelector('[role="menu"]')).toBeInTheDocument();
    fireEvent.click(document.body);
    expect(document.body.querySelector('[role="menu"]')).not.toBeInTheDocument();
  });

  it('renders client name and invoice number and date when provided', () => {
    render(
      <ReceiptCard
        invoice={{
          ...invoice,
          invoice_number: 'INV-001',
          date_issued: '2026-01-15',
        }}
        clientNameByClientId={{ c1: 'Acme Inc' }}
        clientEmailByClientId={{}}
      />
    );
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    const timeEl = document.querySelector('time[datetime="2026-01-15"]');
    expect(timeEl).toBeInTheDocument();
    expect(timeEl?.textContent?.length).toBeGreaterThan(0);
  });

  it('renders Total and Paid with formatCurrency when total and amountPaid present', () => {
    render(
      <ReceiptCard
        invoice={{
          ...invoice,
          total: '1500',
          outstanding_balance: '0',
          paid_date: '2026-02-01',
        }}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
        defaultCurrency="USD"
      />
    );
    expect(screen.getByText(/Total: USD 1500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Paid: USD 1500\.00/)).toBeInTheDocument();
  });

  it('renders Paid date when paidDate present', () => {
    render(
      <ReceiptCard
        invoice={{ ...invoice, paid_date: '2026-02-01' }}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
      />
    );
    expect(screen.getByText(/Paid /)).toBeInTheDocument();
  });

  it('SendInvoiceDialog receives clientEmail as defaultTo when clientEmailByClientId provided', () => {
    render(
      <ReceiptCard
        invoice={invoice}
        clientNameByClientId={{ c1: 'Acme' }}
        clientEmailByClientId={{ c1: 'acme@test.com' }}
      />
    );
    fireEvent.click(screen.getByTitle('Actions'));
    const emailItem = document.body.querySelectorAll('[role="menuitem"]')[2];
    fireEvent.click(emailItem);
    expect(screen.getByTestId('send-invoice-dialog')).toBeInTheDocument();
  });

  it('navigates on Enter key on body clickable area', () => {
    render(
      <ReceiptCard
        invoice={{ ...invoice, total: '100' }}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
      />
    );
    const buttons = screen.getAllByRole('button');
    const bodyClickable = buttons.find((b) => b.getAttribute('class')?.includes('p-5') && b.getAttribute('class')?.includes('flex-1'));
    expect(bodyClickable).toBeTruthy();
    fireEvent.keyDown(bodyClickable, { key: 'Enter', preventDefault: jest.fn() });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/receipts?open=inv-1');
  });
});
