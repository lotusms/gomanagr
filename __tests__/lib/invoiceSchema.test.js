/**
 * Unit tests for lib/invoiceSchema.js
 */

import {
  INVOICE_DB_FIELDS,
  INVOICE_PAYLOAD_KEYS,
  INVOICE_INITIAL_KEYS,
} from '@/lib/invoiceSchema';

describe('invoiceSchema', () => {
  it('INVOICE_DB_FIELDS includes required invoice fields in snake_case', () => {
    expect(INVOICE_DB_FIELDS).toContain('client_id');
    expect(INVOICE_DB_FIELDS).toContain('invoice_number');
    expect(INVOICE_DB_FIELDS).toContain('total');
    expect(INVOICE_DB_FIELDS).toContain('status');
    expect(INVOICE_DB_FIELDS).toContain('outstanding_balance');
    expect(INVOICE_DB_FIELDS).toContain('line_items');
    expect(INVOICE_DB_FIELDS).toContain('paid_date');
    expect(INVOICE_DB_FIELDS).toContain('payment_terms');
    expect(INVOICE_DB_FIELDS.every((f) => typeof f === 'string')).toBe(true);
  });

  it('INVOICE_PAYLOAD_KEYS includes fields sent from form to API', () => {
    expect(INVOICE_PAYLOAD_KEYS).toContain('invoice_number');
    expect(INVOICE_PAYLOAD_KEYS).toContain('line_items');
    expect(INVOICE_PAYLOAD_KEYS).toContain('outstanding_balance');
    expect(INVOICE_PAYLOAD_KEYS).not.toContain('user_id');
  });

  it('INVOICE_INITIAL_KEYS includes client_id and line_items for form init', () => {
    expect(INVOICE_INITIAL_KEYS).toContain('client_id');
    expect(INVOICE_INITIAL_KEYS).toContain('line_items');
    expect(INVOICE_INITIAL_KEYS).toContain('file_url');
    expect(INVOICE_INITIAL_KEYS).toContain('file_urls');
  });
});
