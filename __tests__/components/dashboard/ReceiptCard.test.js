/**
 * Unit tests for ReceiptCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReceiptCard from '@/components/dashboard/ReceiptCard';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (d) => (d ? new Date(d).toLocaleDateString() : '—'),
}));

jest.mock('@/lib/buildDocumentPayload', () => ({
  buildCompanyForDocument: () => ({}),
  buildInvoiceDocumentPayload: () => ({}),
}));

jest.mock('@/components/documents', () => ({
  DocumentViewDialog: () => null,
}));

jest.mock('@/components/invoices/SendInvoiceDialog', () => () => null);

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
    const push = jest.fn();
    jest.spyOn(require('next/router'), 'useRouter').mockReturnValue({ push });
    render(
      <ReceiptCard
        invoice={invoice}
        clientNameByClientId={{}}
        clientEmailByClientId={{}}
      />
    );
    fireEvent.click(screen.getByText('January Receipt').closest('[role="button"]'));
    expect(push).toHaveBeenCalledWith('/dashboard/receipts?open=inv-1');
  });
});
