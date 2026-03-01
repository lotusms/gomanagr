/**
 * Unit tests for ClientContractForm:
 * - Contract Value label shows currency from settings: "Contract Value (USD)" or "Contract Value (EUR)"
 * - Contract value field uses CurrencyInput and is formatted according to defaultCurrency
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ClientContractForm from '@/components/clients/add-client/ClientContractForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', push: jest.fn(), replace: jest.fn(), query: {} }),
}));

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

describe('ClientContractForm', () => {
  const defaultProps = {
    clientId: 'c1',
    userId: 'u1',
    onSuccess: () => {},
    onCancel: () => {},
  };

  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (url.includes('get-client-proposals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ proposals: [] }) });
      }
      if (url.includes('get-org-team-list')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ teamMembers: [] }) });
      }
      return Promise.reject(new Error('Unexpected fetch'));
    });
  });

  afterEach(() => {
    global.fetch.mockRestore?.();
  });

  it('shows Contract Value label with USD when defaultCurrency is USD', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="USD" />);
    expect(await screen.findByText('Contract Value (USD)')).toBeInTheDocument();
  });

  it('shows Contract Value label with EUR when defaultCurrency is EUR', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="EUR" />);
    expect(await screen.findByText('Contract Value (EUR)')).toBeInTheDocument();
  });

  it('shows Contract Value label with GBP when defaultCurrency is GBP', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="GBP" />);
    expect(await screen.findByText('Contract Value (GBP)')).toBeInTheDocument();
  });

  it('defaults to USD when defaultCurrency is not passed', async () => {
    render(<ClientContractForm {...defaultProps} />);
    expect(await screen.findByText('Contract Value (USD)')).toBeInTheDocument();
  });

  it('renders contract value input with id contract-value', async () => {
    render(<ClientContractForm {...defaultProps} defaultCurrency="USD" />);
    const input = await screen.findByLabelText(/Contract Value \(USD\)/);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'contract-value');
  });
});
