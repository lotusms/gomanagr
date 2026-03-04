/**
 * Unit tests for ClientInvoiceForm:
 * - Outstanding balance label shows currency; Tax/Total are in Line items step (ItemizedLineItems)
 * - Payment method is a dropdown
 * - Linked proposal, Linked project, Linked contract are dropdowns with correct labels
 * - defaultCurrency defaults to USD
 * - Notes and Invoices (PDF) are on Step 3 (Notes & files)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
      if (u?.includes?.('get-client-proposals') || u?.includes?.('get-proposals')) {
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

  it('shows Outstanding balance label with USD when defaultCurrency is USD', async () => {
    render(<ClientInvoiceForm {...defaultProps} defaultCurrency="USD" />);
    expect(await screen.findByText('Outstanding balance (USD)')).toBeInTheDocument();
  });

  it('shows Outstanding balance label with currency', async () => {
    render(<ClientInvoiceForm {...defaultProps} defaultCurrency="EUR" />);
    expect(await screen.findByText('Outstanding balance (EUR)')).toBeInTheDocument();
  });

  it('defaults to USD when defaultCurrency is not passed', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Outstanding balance (USD)')).toBeInTheDocument();
  });

  it('shows Payment method dropdown', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Payment method')).toBeInTheDocument();
    const paymentSelect = document.getElementById('payment-method') || screen.getByLabelText('Payment method');
    expect(paymentSelect).toBeInTheDocument();
  });

  it('shows Use Proposal in header and Linked project, Linked contract in step 1', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    expect(await screen.findByText('Use Proposal')).toBeInTheDocument();
    expect(screen.getByText('Linked project')).toBeInTheDocument();
    expect(screen.getByText('Linked contract')).toBeInTheDocument();
  });

  it('shows Notes textarea on step 3', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    const step3Button = screen.getByRole('button', { name: /3/ });
    fireEvent.click(step3Button);
    expect(await screen.findByLabelText('Notes')).toBeInTheDocument();
  });

  it('shows Invoice files (PDF) upload on step 3', async () => {
    render(<ClientInvoiceForm {...defaultProps} />);
    const step3Button = screen.getByRole('button', { name: /3/ });
    fireEvent.click(step3Button);
    expect(await screen.findByText('Invoice files (PDF)')).toBeInTheDocument();
  });
});
