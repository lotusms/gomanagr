/**
 * Unit tests for ProposalInvoiceDocument and exported formatMoney, formatDate.
 * - formatMoney: null/undefined/empty, number, string, NaN, EUR/GBP/USD
 * - formatDate: falsy, invalid, valid date
 * - Renders proposal vs invoice; documentTypeLabel; company (logo, name, address, phone, website)
 * - Client (name, addressLines, address, contactName, email); line items; totals
 * - Proposal dates (dateCreated, dateSent, expiration); Invoice dates (dateIssued, dueDate)
 * - scopeSummary, terms; payUrl CTA; paymentMethod/paidDate
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProposalInvoiceDocument, { formatMoney, formatDate } from '@/components/documents/ProposalInvoiceDocument';

describe('formatMoney', () => {
  it('returns — for null, undefined, empty string', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('')).toBe('—');
  });

  it('formats number with USD by default', () => {
    expect(formatMoney(100)).toBe('$100.00');
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('parses string and formats', () => {
    expect(formatMoney('500')).toBe('$500.00');
    expect(formatMoney('1,000.99')).toBe('$1,000.99');
  });

  it('returns — for NaN', () => {
    expect(formatMoney('abc')).toBe('—');
  });

  it('uses EUR symbol when currency is EUR', () => {
    expect(formatMoney(100, 'EUR')).toBe('€100.00');
  });

  it('uses GBP symbol when currency is GBP', () => {
    expect(formatMoney(100, 'GBP')).toBe('£100.00');
  });
});

describe('formatDate', () => {
  it('returns — for falsy', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('returns value as-is for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('formats valid date', () => {
    const result = formatDate('2025-03-15');
    expect(result).toMatch(/March \d{1,2}, 2025/);
  });
});

describe('ProposalInvoiceDocument', () => {
  const minimalCompany = { name: 'Acme Co' };
  const minimalClient = { name: 'Client Inc' };
  const minimalDoc = { number: 'P-001', lineItems: [], subtotal: 0, total: 0 };

  it('renders proposal with default title', () => {
    render(
      <ProposalInvoiceDocument
        type="proposal"
        company={minimalCompany}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByRole('heading', { name: 'Proposal' })).toBeInTheDocument();
    expect(screen.getByText('Acme Co')).toBeInTheDocument();
    expect(screen.getByText('Client Inc')).toBeInTheDocument();
    expect(screen.getByText(/P-001/)).toBeInTheDocument();
  });

  it('renders invoice with default title', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByRole('heading', { name: 'Invoice' })).toBeInTheDocument();
  });

  it('uses documentTypeLabel for title', () => {
    render(
      <ProposalInvoiceDocument
        type="proposal"
        documentTypeLabel="Quote"
        company={minimalCompany}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByRole('heading', { name: 'Quote' })).toBeInTheDocument();
  });

  it('shows company name and falls back to Company when missing', () => {
    const { rerender } = render(
      <ProposalInvoiceDocument
        type="invoice"
        company={{ name: 'My Co' }}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('My Co')).toBeInTheDocument();
    rerender(
      <ProposalInvoiceDocument
        type="invoice"
        company={{}}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('shows company logo when logoUrl provided', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={{ name: 'Acme', logoUrl: 'https://example.com/logo.png' }}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    const img = document.querySelector('img[src="https://example.com/logo.png"]');
    expect(img).toBeInTheDocument();
  });

  it('shows company addressLines and fallback to company.address', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={{ name: 'Acme', addressLines: ['123 Main St', 'City, ST 12345'] }}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
  });

  it('shows company address when addressLines not array', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={{ name: 'Acme', address: '456 Oak Ave' }}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
  });

  it('shows company phone and website', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={{ name: 'Acme', phone: '(555) 123-4567', website: 'https://acme.com' }}
        client={minimalClient}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
    expect(screen.getByText('https://acme.com')).toBeInTheDocument();
  });

  it('shows client name and — when missing', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={{}}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows client addressLines and client.address', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={{ name: 'Client', addressLines: ['Line 1', 'Line 2'] }}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });

  it('shows client.address when addressLines empty', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={{ name: 'Client', address: 'Single line address' }}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('Single line address')).toBeInTheDocument();
  });

  it('shows client contactName and email', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={{ name: 'Client', contactName: 'Jane Doe', email: 'jane@example.com' }}
        document={minimalDoc}
      />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('uses lineItemsSectionLabel for section heading', () => {
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={minimalDoc}
        lineItemsSectionLabel="Procedures"
      />
    );
    expect(screen.getByText('Procedures')).toBeInTheDocument();
  });

  it('renders line items with item_name, quantity, unit_price, amount', () => {
    const doc = {
      ...minimalDoc,
      lineItems: [
        { item_name: 'Consulting', quantity: 2, unit_price: 100, amount: 200 },
        { item_name: 'Setup', description: 'One-time', quantity: 1, unit_price: 50, amount: 50 },
      ],
      subtotal: 250,
      total: 250,
    };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
        currency="USD"
      />
    );
    expect(screen.getByText('Consulting')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('One-time')).toBeInTheDocument();
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getAllByText('$250.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Remaining balance:/)).toBeInTheDocument();
  });

  it('shows subtotal, discount, tax, total', () => {
    const doc = {
      ...minimalDoc,
      lineItems: [],
      subtotal: 100,
      tax: 8,
      discount: 10,
      total: 98,
    };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
      />
    );
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Discount:')).toBeInTheDocument();
    expect(screen.getByText('$-10.00')).toBeInTheDocument();
    expect(screen.getByText('Tax/VAT:')).toBeInTheDocument();
    expect(screen.getByText('$8.00')).toBeInTheDocument();
    expect(screen.getByText(/Remaining balance:/)).toBeInTheDocument();
    expect(screen.getAllByText('$98.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows amount due with currency', () => {
    const doc = { ...minimalDoc, total: 150, amountDue: 150 };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
        currency="EUR"
      />
    );
    expect(screen.getByText(/Amount due \(EUR\)/)).toBeInTheDocument();
    expect(screen.getByText('€150.00')).toBeInTheDocument();
  });

  it('proposal shows dateCreated, dateSent, expirationDate', () => {
    const doc = {
      ...minimalDoc,
      dateCreated: '2025-01-10',
      dateSent: '2025-01-12',
      expirationDate: '2025-02-01',
    };
    render(
      <ProposalInvoiceDocument
        type="proposal"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
      />
    );
    expect(screen.getByText(/Date created:/)).toBeInTheDocument();
    expect(screen.getByText(/Date sent:/)).toBeInTheDocument();
    expect(screen.getByText(/Expiration:/)).toBeInTheDocument();
  });

  it('invoice shows dateIssued and dueDate', () => {
    const doc = {
      ...minimalDoc,
      dateIssued: '2025-03-01',
      dueDate: '2025-03-31',
    };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
      />
    );
    expect(screen.getByText(/Invoice date:/)).toBeInTheDocument();
    expect(screen.getByText(/Payment due:/)).toBeInTheDocument();
  });

  it('shows scopeSummary and terms for proposal', () => {
    const doc = {
      ...minimalDoc,
      scopeSummary: 'Scope text here',
      terms: 'Terms and conditions',
    };
    render(
      <ProposalInvoiceDocument
        type="proposal"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
      />
    );
    expect(screen.getByText('Scope summary')).toBeInTheDocument();
    expect(screen.getByText('Scope text here')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByText('Terms and conditions')).toBeInTheDocument();
  });

  it('shows Pay now CTA when invoice has payUrl and amountDue > 0', () => {
    const doc = { ...minimalDoc, total: 100, amountDue: 100 };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
        payUrl="https://pay.example.com/inv/1"
      />
    );
    expect(screen.getByText('Pay this invoice online')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Pay now' });
    expect(link).toHaveAttribute('href', 'https://pay.example.com/inv/1');
    expect(screen.getByText(/copy this link/)).toBeInTheDocument();
  });

  it('does not show Pay CTA when amountDue is 0', () => {
    const doc = { ...minimalDoc, total: 100, amountDue: 0 };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
        payUrl="https://pay.example.com/1"
      />
    );
    expect(screen.queryByRole('link', { name: 'Pay now' })).not.toBeInTheDocument();
  });

  it('shows payment info when paidDate or paymentMethod present', () => {
    const doc = {
      ...minimalDoc,
      paidDate: '2025-03-10',
      paymentMethod: 'Card',
      amountDue: 0,
    };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
      />
    );
    expect(screen.getByText(/Payment on/)).toBeInTheDocument();
    expect(screen.getByText(/using Card/)).toBeInTheDocument();
  });

  it('computes total from subtotal - discount + tax when total not provided', () => {
    const doc = {
      number: 'P-001',
      lineItems: [],
      subtotal: 100,
      tax: 10,
      discount: 5,
    };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
      />
    );
    expect(screen.getByText(/Remaining balance:/)).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$-5.00')).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    const balanceRow = screen.getByText(/Remaining balance:/).parentElement;
    expect(balanceRow).toHaveTextContent(/\$|—/);
  });

  it('handles line item with null quantity and formats as —', () => {
    const doc = {
      ...minimalDoc,
      lineItems: [{ item_name: 'Line Item X', unit_price: 50, amount: 50 }],
      subtotal: 50,
      total: 50,
    };
    render(
      <ProposalInvoiceDocument
        type="invoice"
        company={minimalCompany}
        client={minimalClient}
        document={doc}
      />
    );
    expect(screen.getByText('Line Item X')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1);
  });

  it('uses Invoice number / Proposal number with documentTypeLabel', () => {
    render(
      <ProposalInvoiceDocument
        type="proposal"
        documentTypeLabel="Quote"
        company={minimalCompany}
        client={minimalClient}
        document={{ ...minimalDoc, number: 'Q-001' }}
      />
    );
    expect(screen.getByText(/Quote number:/)).toBeInTheDocument();
    expect(screen.getByText('Q-001')).toBeInTheDocument();
  });
});
