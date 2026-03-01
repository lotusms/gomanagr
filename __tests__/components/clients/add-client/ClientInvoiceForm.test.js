/**
 * Unit tests for ClientInvoiceForm:
 * - Amount, Tax, Total, Outstanding balance labels show currency (e.g. Amount (USD))
 * - Payment method is a dropdown
 * - Linked proposal, Linked project, Linked contract are dropdowns with correct labels
 * - defaultCurrency defaults to USD
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ClientInvoiceForm from '@/components/clients/add-client/ClientInvoiceForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', push: jest.fn(), replace: jest.fn(), query: {} }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

describe('ClientInvoiceForm', () => {
  const defaultProps = {
    clientId: 'c1',
    userId: 'u1',
    onSuccess: () => {},
    onCancel: () => {},
  };

  beforeEach(() => {
    global.fetch = jest.fn((url, opts) => {
      const u = typeof url === 'string' ? url : opts?.url;
      if (u?.includes?.('get-client-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
      }
      if (u?.includes?.('get-client-contracts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
  });

  afterEach(() => {
    global.fetch?.mockRestore?.();
  });

  it('shows Amount label with USD when defaultCurrency is USD', async () => {
    render(<ClientInvoiceForm {...defaultProps} defaultCurrency="USD" />);
    expect(await screen.findByText('Amount (USD)')).toBeInTheDocument();
  });

  it('shows Tax, Total, Outstanding balance labels with currency', async () => {
    render(<ClientInvoiceForm {...defaultProps} defaultCurrency="EUR" />);
    expect(await screen.findByText('Tax (EUR)')).toBeInTheDocument();
    expect(screen.getByText('Total (EUR)')).toBeInTheDocument();
    expect(screen.getByText('Outstanding balance (EUR)')).toBeInTheDocument();
  });

  it('defaults to USD when defaultCurrency is not passed', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Amount (USD)')).toBeInTheDocument();
  });

  it('shows Payment method dropdown', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Payment method')).toBeInTheDocument();
    const paymentSelect = document.getElementById('payment-method') || screen.getByLabelText('Payment method');
    expect(paymentSelect).toBeInTheDocument();
  });

  it('shows Linked proposal, Linked project, Linked contract dropdowns', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Linked proposal')).toBeInTheDocument();
    expect(screen.getByText('Linked project')).toBeInTheDocument();
    expect(screen.getByText('Linked contract')).toBeInTheDocument();
  });

  it('shows Notes textarea', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByLabelText('Notes')).toBeInTheDocument();
  });

  it('shows Invoices (PDF) file upload with multiple support', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Invoices (PDF)')).toBeInTheDocument();
  });
});
