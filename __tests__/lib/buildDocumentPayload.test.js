/**
 * Unit tests for lib/buildDocumentPayload.js
 */

import {
  buildCompanyForDocument,
  buildProposalDocumentPayload,
  buildInvoiceDocumentPayload,
} from '@/lib/buildDocumentPayload';

describe('buildDocumentPayload', () => {
  describe('buildCompanyForDocument', () => {
    it('uses org name, logo, address lines, phone, website when org provided', () => {
      const org = {
        name: 'Org Name',
        logo_url: 'https://example.com/logo.png',
        address_line_1: ' 123 Main St ',
        address_line_2: ' Suite 4 ',
        city: 'Boston',
        state: 'MA',
        postal_code: '02101',
        country: 'USA',
        phone: ' 555-1234 ',
        website: ' https://org.com ',
      };
      const result = buildCompanyForDocument(null, org);
      expect(result.name).toBe('Org Name');
      expect(result.logoUrl).toBe('https://example.com/logo.png');
      expect(result.addressLines).toEqual([
        '123 Main St',
        'Suite 4',
        'Boston, MA, 02101',
        'USA',
      ]);
      expect(result.phone).toBe('555-1234');
      expect(result.website).toBe('https://org.com');
    });

    it('builds address from org without address_line_2 or country when empty', () => {
      const org = {
        name: 'Short Org',
        address_line_1: '456 Oak Ave',
        city: 'NYC',
        state: 'NY',
      };
      const result = buildCompanyForDocument(null, org);
      expect(result.addressLines).toEqual(['456 Oak Ave', 'NYC, NY']);
    });

    it('uses account companyAddressLines when no org address_line_1', () => {
      const account = {
        companyName: 'Acme',
        companyAddressLines: ['Line 1', 'Line 2'],
      };
      const result = buildCompanyForDocument(account, null);
      expect(result.name).toBe('Acme');
      expect(result.addressLines).toEqual(['Line 1', 'Line 2']);
    });

    it('uses account companyAddress when no companyAddressLines', () => {
      const account = {
        companyAddress: '  Single line address ',
      };
      const result = buildCompanyForDocument(account, null);
      expect(result.addressLines).toEqual(['Single line address']);
    });

    it('uses organizationAddress and organizationAddress2 when addressLines empty', () => {
      const account = {
        companyName: 'Co',
        organizationAddress: ' Org addr 1 ',
        organizationAddress2: ' Org addr 2 ',
      };
      const result = buildCompanyForDocument(account, null);
      expect(result.addressLines).toEqual(['Org addr 1', 'Org addr 2']);
    });

    it('uses org over account for name and logo when both provided', () => {
      const account = { companyName: 'Account', companyLogo: 'https://a.com/logo.png' };
      const org = { name: 'Org', logo_url: 'https://o.com/logo.png' };
      const result = buildCompanyForDocument(account, org);
      expect(result.name).toBe('Org');
      expect(result.logoUrl).toBe('https://o.com/logo.png');
    });

    it('returns Company when account and org missing or empty', () => {
      expect(buildCompanyForDocument(null, null).name).toBe('Company');
      expect(buildCompanyForDocument({}, null).name).toBe('Company');
    });
  });

  describe('buildProposalDocumentPayload', () => {
    it('builds payload from proposal with line_items using amount', () => {
      const p = {
        proposal_title: ' My Proposal ',
        proposal_number: ' P-001 ',
        date_created: '2024-01-01',
        date_sent: '2024-01-02',
        expiration_date: '2024-02-01',
        line_items: [
          { item_name: 'Item A', quantity: 2, unit_price: '10.50', amount: '21.00' },
          { item_name: 'Item B', amount: '50.00' },
        ],
        scope_summary: 'Scope',
        terms: 'Terms',
        tax: '5.00',
        discount: '2.00',
      };
      const result = buildProposalDocumentPayload(p);
      expect(result.title).toBe('My Proposal');
      expect(result.number).toBe('P-001');
      expect(result.dateCreated).toBe('2024-01-01');
      expect(result.dateSent).toBe('2024-01-02');
      expect(result.expirationDate).toBe('2024-02-01');
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0]).toMatchObject({
        item_name: 'Item A',
        quantity: 2,
        unit_price: '10.50',
        amount: '21.00',
      });
      expect(result.lineItems[1].amount).toBe('50.00');
      expect(result.subtotal).toBe(71);
      expect(result.tax).toBe(5);
      expect(result.discount).toBe(2);
      expect(result.total).toBe(74);
      expect(result.amountDue).toBe(74);
      expect(result.scopeSummary).toBe('Scope');
      expect(result.terms).toBe('Terms');
    });

    it('computes line item amount from quantity * unit_price when amount missing', () => {
      const p = {
        line_items: [
          { item_name: 'X', quantity: 3, unit_price: '10' },
        ],
      };
      const result = buildProposalDocumentPayload(p);
      expect(result.lineItems[0].amount).toBe('30.00');
      expect(result.subtotal).toBe(30);
    });

    it('returns defaults for null or empty proposal', () => {
      const result = buildProposalDocumentPayload(null);
      expect(result.title).toBe('Proposal');
      expect(result.number).toBe('');
      expect(result.lineItems).toEqual([]);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('buildInvoiceDocumentPayload', () => {
    it('builds payload from invoice with line_items and total', () => {
      const inv = {
        invoice_title: ' My Invoice ',
        invoice_number: ' INV-001 ',
        date_issued: '2024-01-10',
        due_date: '2024-02-10',
        line_items: [
          { item_name: 'Service', quantity: 1, unit_price: '100', amount: '100.00' },
        ],
        tax: '8',
        discount: '5',
        total: '103',
        outstanding_balance: '103',
        payment_method: 'Card',
        paid_date: null,
        scope_summary: 'Scope',
        terms: 'Terms',
      };
      const result = buildInvoiceDocumentPayload(inv);
      expect(result.title).toBe('My Invoice');
      expect(result.number).toBe('INV-001');
      expect(result.dateIssued).toBe('2024-01-10');
      expect(result.dueDate).toBe('2024-02-10');
      expect(result.lineItems[0].amount).toBe('100.00');
      expect(result.subtotal).toBe(100);
      expect(result.tax).toBe(8);
      expect(result.discount).toBe(5);
      expect(result.total).toBe(103);
      expect(result.amountDue).toBe(103);
      expect(result.paymentMethod).toBe('Card');
      expect(result.scopeSummary).toBe('Scope');
      expect(result.terms).toBe('Terms');
    });

    it('computes total from subtotal - discount + tax when inv.total missing', () => {
      const inv = {
        line_items: [{ item_name: 'A', amount: '50' }],
        tax: '5',
        discount: '2',
      };
      const result = buildInvoiceDocumentPayload(inv);
      expect(result.total).toBe(53);
      expect(result.amountDue).toBe(53);
    });

    it('uses outstanding_balance for amountDue when provided', () => {
      const inv = {
        line_items: [{ item_name: 'A', amount: '100' }],
        total: '100',
        outstanding_balance: '50',
      };
      const result = buildInvoiceDocumentPayload(inv);
      expect(result.amountDue).toBe(50);
    });

    it('returns defaults for null or empty invoice', () => {
      const result = buildInvoiceDocumentPayload(null);
      expect(result.title).toBe('Invoice');
      expect(result.lineItems).toEqual([]);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
      expect(result.amountDue).toBe(0);
    });
  });
});
