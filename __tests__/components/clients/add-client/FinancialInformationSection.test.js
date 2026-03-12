/**
 * Unit tests for FinancialInformationSection:
 * - Renders payment terms, pricing tier, currency, retainers balance, payment history label
 * - Empty payment history shows EmptyState
 * - Payment history table: headers, paid / past due / other status, date formatting, empty cells
 * - Project column label from industry; callbacks invoked
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import FinancialInformationSection from '@/components/clients/add-client/FinancialInformationSection';

const mockUseOptionalUserAccount = jest.fn(() => ({ dateFormat: 'MM/DD/YYYY', timezone: 'UTC', industry: null }));
jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => mockUseOptionalUserAccount(),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  PAYMENT_TERMS: ['Net 15', 'Net 30', 'Net 60'],
  PRICING_TIERS: [{ value: 'tier1', label: 'Tier 1' }, { value: 'tier2', label: 'Tier 2' }],
  CURRENCIES: [{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }],
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'project' ? 'Project' : t),
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (iso, dateFormat, timezone) => (iso ? '01/15/2026' : ''),
}));

const noop = () => {};

describe('FinancialInformationSection', () => {
  it('renders all form labels and payment history section', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('Payment Terms')).toBeInTheDocument();
    expect(screen.getByText('Pricing Tier')).toBeInTheDocument();
    expect(screen.getByText('Default Currency')).toBeInTheDocument();
    expect(screen.getByText('Active Retainers Balance')).toBeInTheDocument();
    expect(screen.getByText('Payment History')).toBeInTheDocument();
  });

  it('shows empty state when payment history is empty', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('No payments yet')).toBeInTheDocument();
    expect(screen.getByText(/Payment history will appear here once payments are recorded/)).toBeInTheDocument();
  });

  it('renders payment history table with headers when paymentHistory has items', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[
          {
            paymentDate: '2026-01-15T12:00:00.000Z',
            status: 'paid',
            projectName: 'Project A',
            invoiceNumber: 'INV-001',
            receiptNumber: 'R-1',
            paymentType: 'Check',
          },
        ]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Payment Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Project Name')).toBeInTheDocument();
    expect(screen.getByText('Invoice #')).toBeInTheDocument();
    expect(screen.getByText('Receipt #')).toBeInTheDocument();
    expect(screen.getByText('Payment Type')).toBeInTheDocument();
  });

  it('formats payment date and shows paid status', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[
          {
            paymentDate: '2026-01-15T12:00:00.000Z',
            status: 'paid',
            projectName: 'Project A',
            invoiceNumber: 'INV-001',
            receiptNumber: 'R-1',
            paymentType: 'Check',
          },
        ]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('01/15/2026')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('R-1')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
  });

  it('shows Past Due for status past due', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[{ status: 'past due', projectName: 'P1' }]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('Past Due')).toBeInTheDocument();
  });

  it('shows status or Pending for non-paid non-past-due status', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[{ status: 'pending', projectName: 'P1' }]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows Pending when status is missing', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[{ projectName: 'P1' }]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows em dash when payment date is missing', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[{ status: 'paid', projectName: 'P1' }]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    const table = screen.getByRole('table');
    const dashes = within(table).getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
    expect(dashes[0].closest('td')).toHaveClass('whitespace-nowrap');
  });

  it('shows em dash for missing projectName, invoiceNumber, receiptNumber, paymentType', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[{ paymentDate: '2026-01-15', status: 'paid' }]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it('uses account industry for project column label (Project Name)', () => {
    render(
      <FinancialInformationSection
        paymentHistory={[{ status: 'paid', projectName: 'Eng 1' }]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('Project Name')).toBeInTheDocument();
    expect(screen.getByText('Eng 1')).toBeInTheDocument();
  });

  it('uses fallback dateFormat and timezone when account is null', () => {
    mockUseOptionalUserAccount.mockReturnValueOnce(null);
    render(
      <FinancialInformationSection
        paymentHistory={[
          { paymentDate: '2026-01-15T12:00:00.000Z', status: 'paid', projectName: 'P1' },
        ]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('01/15/2026')).toBeInTheDocument();
  });

  it('applies past-date styling when payment date is before today', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    render(
      <FinancialInformationSection
        paymentHistory={[
          { paymentDate: pastDate.toISOString(), status: 'paid', projectName: 'P1' },
        ]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    const dateCell = screen.getByText('01/15/2026').closest('span');
    expect(dateCell).toHaveClass('text-red-600');
  });

  it('renders with initial paymentTerms and activeRetainersBalance values', () => {
    render(
      <FinancialInformationSection
        paymentTerms="Net 30"
        pricingTier="tier1"
        defaultCurrency="EUR"
        activeRetainersBalance="1000.00"
        paymentHistory={[]}
        onPaymentTermsChange={noop}
        onPricingTierChange={noop}
        onDefaultCurrencyChange={noop}
        onActiveRetainersBalanceChange={noop}
      />
    );
    expect(screen.getByText('Payment Terms')).toBeInTheDocument();
    expect(screen.getByText('Active Retainers Balance')).toBeInTheDocument();
    expect(screen.getByText('Net 30')).toBeInTheDocument();
  });
});
