/**
 * Unit tests for lib/dashboardActionUtils.js: parseAmount, todayKey, daysFromToday, buildFollowUps, getInvoicesSummary, getProposalsPipeline, buildRecentlyUpdated
 */
import {
  parseAmount,
  todayKey,
  daysFromToday,
  buildFollowUps,
  getInvoicesSummary,
  getProposalsPipeline,
  buildRecentlyUpdated,
} from '@/lib/dashboardActionUtils';

describe('dashboardActionUtils', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-12T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('parseAmount', () => {
    it('returns 0 for null or empty string', () => {
      expect(parseAmount(null)).toBe(0);
      expect(parseAmount('')).toBe(0);
    });

    it('parses number and strips non-numeric except digits, dot, minus', () => {
      expect(parseAmount(100)).toBe(100);
      expect(parseAmount('1,234.56')).toBe(1234.56);
      expect(parseAmount('$500.00')).toBe(500);
      expect(parseAmount('-50')).toBe(-50);
    });

    it('returns 0 for NaN after parse', () => {
      expect(parseAmount('abc')).toBe(0);
      expect(parseAmount('--')).toBe(0);
    });
  });

  describe('todayKey', () => {
    it('returns YYYY-MM-DD for today', () => {
      expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(todayKey()).toBe('2025-03-12');
    });
  });

  describe('daysFromToday', () => {
    it('returns 0 when dateStr is falsy', () => {
      expect(daysFromToday('')).toBe(0);
      expect(daysFromToday(null)).toBe(0);
    });

    it('returns negative for past dates and positive for future', () => {
      expect(daysFromToday('2025-03-10')).toBe(-2);
      expect(daysFromToday('2025-03-15')).toBe(3);
      expect(daysFromToday('2025-03-12')).toBe(0);
    });
  });

  describe('buildFollowUps', () => {
    it('skips void and paid invoices', () => {
      const data = {
        invoices: [
          { id: '1', status: 'void', due_date: '2025-03-15', client_id: 'c1' },
          { id: '2', status: 'paid', due_date: '2025-03-15', client_id: 'c1' },
        ],
        proposals: [],
      };
      expect(buildFollowUps(data)).toEqual([]);
    });

    it('includes open invoices with overdue or due reason and client name', () => {
      const data = {
        invoices: [
          { id: 'i1', status: 'sent', due_date: '2025-03-10', client_id: 'c1', invoice_number: 'INV-001' },
          { id: 'i2', status: 'draft', due_date: '2025-03-20', client_id: 'c2', invoice_number: 'INV-002' },
        ],
        proposals: [],
      };
      const clientNameById = { c1: 'Client One', c2: 'Client Two' };
      const items = buildFollowUps(data, clientNameById);
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        id: 'inv-i1',
        type: 'invoice',
        reason: 'Invoice overdue',
        dueDate: '2025-03-10',
        days: -2,
        clientId: 'c1',
        clientName: 'Client One',
        resourceId: 'i1',
        resourceNumber: 'INV-001',
      });
      expect(items[1].reason).toBe('Invoice due');
      expect(items[1].clientName).toBe('Client Two');
    });

    it('uses Unknown when client not in clientNameById', () => {
      const data = { invoices: [{ id: 'i1', status: 'sent', due_date: '2025-03-20', client_id: 'c9' }], proposals: [] };
      const items = buildFollowUps(data, {});
      expect(items[0].clientName).toBe('Unknown');
    });

    it('uses invoiceTermSingular when provided', () => {
      const data = { invoices: [{ id: 'i1', status: 'sent', due_date: '2025-03-10', client_id: 'c1' }], proposals: [] };
      const items = buildFollowUps(data, { c1: 'C' }, { invoiceTermSingular: 'Bill' });
      expect(items[0].reason).toBe('Bill overdue');
    });

    it('skips invoices without due_date or date_issued', () => {
      const data = {
        invoices: [
          { id: 'i1', status: 'sent', client_id: 'c1' },
          { id: 'i2', status: 'sent', date_issued: '2025-03-20', client_id: 'c1' },
        ],
        proposals: [],
      };
      const items = buildFollowUps(data, {});
      expect(items).toHaveLength(1);
      expect(items[0].dueDate).toBe('2025-03-20');
    });

    it('includes proposals with status sent or viewed, skips expired', () => {
      const data = {
        invoices: [],
        proposals: [
          { id: 'p1', status: 'sent', expiration_date: '2025-03-20', client_id: 'c1', proposal_number: 'P-1' },
          { id: 'p2', status: 'viewed', expiration_date: '2025-03-05', client_id: 'c2' },
          { id: 'p3', status: 'draft', expiration_date: '2025-03-25', client_id: 'c1' },
        ],
      };
      const items = buildFollowUps(data, { c1: 'C1', c2: 'C2' });
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'prop-p1',
        type: 'proposal',
        reason: 'Proposal follow-up',
        clientName: 'C1',
        resourceNumber: 'P-1',
      });
    });

    it('sorts by days then dueDate and returns at most 7', () => {
      const data = {
        invoices: [
          { id: 'i1', status: 'sent', due_date: '2025-03-25', client_id: 'c1' },
          { id: 'i2', status: 'sent', due_date: '2025-03-08', client_id: 'c1' },
        ],
        proposals: [],
      };
      const items = buildFollowUps(data, {});
      expect(items[0].days).toBeLessThanOrEqual(items[1].days);
      const many = Array.from({ length: 10 }, (_, i) => ({
        id: `i${i}`,
        status: 'sent',
        due_date: `2025-03-${15 + i}`,
        client_id: 'c1',
      }));
      expect(buildFollowUps({ invoices: many, proposals: [] }, {})).toHaveLength(7);
    });

    it('sorts by dueDate when days are equal', () => {
      const data = {
        invoices: [
          { id: 'i1', status: 'sent', due_date: '2025-03-20', client_id: 'c1' },
          { id: 'i2', status: 'sent', due_date: '2025-03-20', client_id: 'c1' },
        ],
        proposals: [{ id: 'p1', status: 'sent', expiration_date: '2025-03-19', client_id: 'c1' }],
      };
      const items = buildFollowUps(data, {});
      expect(items.every((i) => i.days === 7 || i.days === 8)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    it('handles missing data.invoices and data.proposals', () => {
      expect(buildFollowUps({}, {})).toEqual([]);
      expect(buildFollowUps({ invoices: null, proposals: null }, {})).toEqual([]);
    });
  });

  describe('getInvoicesSummary', () => {
    it('skips void and paid invoices', () => {
      const data = {
        invoices: [
          { id: '1', status: 'void', due_date: '2025-03-10', total: 100 },
          { id: '2', status: 'paid', due_date: '2025-03-10', total: 200 },
        ],
      };
      expect(getInvoicesSummary(data)).toEqual({
        overdueCount: 0,
        overdueTotal: 0,
        dueIn7DaysCount: 0,
        dueIn14DaysCount: 0,
        dueIn30DaysCount: 0,
      });
    });

    it('counts overdue and sums overdue total', () => {
      const data = {
        invoices: [
          { id: '1', status: 'sent', due_date: '2025-03-10', total: 100 },
          { id: '2', status: 'sent', due_date: '2025-03-01', outstanding_balance: 250 },
        ],
      };
      const summary = getInvoicesSummary(data);
      expect(summary.overdueCount).toBe(2);
      expect(summary.overdueTotal).toBe(350);
    });

    it('buckets due in 7, 14, 30 days', () => {
      const data = {
        invoices: [
          { id: '1', status: 'sent', due_date: '2025-03-12', total: 10 },
          { id: '2', status: 'sent', due_date: '2025-03-15', total: 10 },
          { id: '3', status: 'sent', due_date: '2025-03-20', total: 10 },
          { id: '4', status: 'sent', due_date: '2025-03-27', total: 10 },
        ],
      };
      const summary = getInvoicesSummary(data);
      expect(summary.dueIn7DaysCount).toBe(2);
      expect(summary.dueIn14DaysCount).toBe(1);
      expect(summary.dueIn30DaysCount).toBe(1);
    });

    it('uses data.invoices or empty array', () => {
      expect(getInvoicesSummary({})).toEqual({
        overdueCount: 0,
        overdueTotal: 0,
        dueIn7DaysCount: 0,
        dueIn14DaysCount: 0,
        dueIn30DaysCount: 0,
      });
    });
  });

  describe('getProposalsPipeline', () => {
    it('counts by status: draft, sent, viewed, accepted, rejected, expired', () => {
      const data = {
        proposals: [
          { id: '1', status: 'draft' },
          { id: '2', status: 'sent' },
          { id: '3', status: 'viewed' },
          { id: '4', status: 'accepted' },
          { id: '5', status: 'rejected' },
          { id: '6', status: 'expired' },
          { id: '7', status: 'DRAFT' },
        ],
      };
      expect(getProposalsPipeline(data)).toEqual({
        draft: 2,
        sent: 1,
        viewed: 1,
        accepted: 1,
        rejected: 1,
        expired: 1,
      });
    });

    it('treats missing status as draft', () => {
      const data = { proposals: [{ id: '1' }] };
      expect(getProposalsPipeline(data).draft).toBe(1);
    });

    it('ignores unknown status', () => {
      const data = { proposals: [{ id: '1', status: 'unknown' }] };
      expect(getProposalsPipeline(data)).toEqual({
        draft: 0,
        sent: 0,
        viewed: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
      });
    });
  });

  describe('buildRecentlyUpdated', () => {
    it('includes invoices with updated_at and description (paid vs updated)', () => {
      const data = {
        invoices: [
          { id: 'i1', updated_at: '2025-03-10T10:00:00', status: 'paid', invoice_number: 'INV-1', client_id: 'c1' },
          { id: 'i2', created_at: '2025-03-11T10:00:00', status: 'sent', invoice_number: 'INV-2', client_id: 'c1' },
        ],
        proposals: [],
      };
      const entries = buildRecentlyUpdated(data, { c1: 'Client' }, 5);
      expect(entries).toHaveLength(2);
      const paidEntry = entries.find((e) => e.id === 'inv-i1');
      const updatedEntry = entries.find((e) => e.id === 'inv-i2');
      expect(paidEntry).toMatchObject({
        type: 'invoice',
        description: 'Invoice INV-1 marked paid',
        updatedAt: '2025-03-10T10:00:00',
        clientName: 'Client',
        resourceId: 'i1',
      });
      expect(updatedEntry.description).toBe('Invoice INV-2 updated');
    });

    it('skips invoices without updated_at or created_at', () => {
      const data = { invoices: [{ id: 'i1', status: 'sent', client_id: 'c1' }], proposals: [] };
      expect(buildRecentlyUpdated(data, {})).toHaveLength(0);
    });

    it('uses invoiceTermSingular when provided', () => {
      const data = {
        invoices: [{ id: 'i1', updated_at: '2025-03-10T10:00:00', status: 'sent', invoice_number: 'B1', client_id: 'c1' }],
        proposals: [],
      };
      const entries = buildRecentlyUpdated(data, {}, 5, { invoiceTermSingular: 'Bill' });
      expect(entries[0].description).toBe('Bill B1 updated');
    });

    it('includes proposals with accepted/created/updated verb', () => {
      const data = {
        invoices: [],
        proposals: [
          { id: 'p1', updated_at: '2025-03-11T10:00:00', status: 'accepted', proposal_number: 'P1', client_id: 'c1' },
          { id: 'p2', created_at: '2025-03-09T10:00:00', status: 'created', proposal_number: 'P2', client_id: 'c1' },
          { id: 'p3', updated_at: '2025-03-08T10:00:00', status: 'viewed', proposal_number: 'P3', client_id: 'c1' },
        ],
      };
      const entries = buildRecentlyUpdated(data, { c1: 'C' }, 5);
      expect(entries).toHaveLength(3);
      expect(entries[0].description).toBe('Proposal P1 accepted');
      expect(entries[1].description).toBe('Proposal P2 created');
      expect(entries[2].description).toBe('Proposal P3 updated');
    });

    it('sorts by updatedAt descending and applies limit', () => {
      const data = {
        invoices: [
          { id: 'i1', updated_at: '2025-03-09T00:00:00', status: 'sent', client_id: 'c1' },
          { id: 'i2', updated_at: '2025-03-11T00:00:00', status: 'sent', client_id: 'c1' },
        ],
        proposals: [],
      };
      const entries = buildRecentlyUpdated(data, {}, 1);
      expect(entries).toHaveLength(1);
      expect(entries[0].updatedAt).toBe('2025-03-11T00:00:00');
    });

    it('uses fallback for missing invoice_number and proposal_number', () => {
      const data = {
        invoices: [{ id: 'inv-long-id', updated_at: '2025-03-10T00:00:00', status: 'sent', client_id: 'c1' }],
        proposals: [],
      };
      const entries = buildRecentlyUpdated(data, {}, 5);
      expect(entries[0].description).toContain('inv-long'); // id slice 0,8 or '—'
    });
  });
});
