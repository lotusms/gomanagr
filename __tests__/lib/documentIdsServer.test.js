/**
 * Unit tests for lib/documentIdsServer.js (CommonJS)
 */

const { formatDocumentId, parseDocumentId } = require('@/lib/documentIdsServer');

describe('documentIdsServer', () => {
  describe('formatDocumentId', () => {
    it('formats org prefix, doc prefix, date, and sequence', () => {
      expect(formatDocumentId('LOT', 'TASK', '20260308', 1)).toBe('LOT-TASK-20260308-001');
      expect(formatDocumentId('LOT', 'TASK', '20260308', 42)).toBe('LOT-TASK-20260308-042');
      expect(formatDocumentId('ABC', 'INV', '20250101', 999)).toBe('ABC-INV-20250101-999');
    });

    it('normalizes date with dashes to 8 digits', () => {
      expect(formatDocumentId('LOT', 'TASK', '2026-03-08', 1)).toBe('LOT-TASK-20260308-001');
    });

    it('pads sequence to 3 digits', () => {
      expect(formatDocumentId('LOT', 'TASK', '20260308', 0)).toBe('LOT-TASK-20260308-000');
      expect(formatDocumentId('LOT', 'TASK', '20260308', 7)).toBe('LOT-TASK-20260308-007');
    });

    it('uses X for org prefix when empty or short', () => {
      expect(formatDocumentId('', 'TASK', '20260308', 1)).toBe('XXX-TASK-20260308-001');
      expect(formatDocumentId('A', 'TASK', '20260308', 1)).toBe('AXX-TASK-20260308-001');
    });

    it('trims and uppercases org prefix to 3 chars', () => {
      expect(formatDocumentId('  lot  ', 'TASK', '20260308', 1)).toBe('LOT-TASK-20260308-001');
    });

    it('clamps sequence to non-negative', () => {
      expect(formatDocumentId('LOT', 'TASK', '20260308', -5)).toBe('LOT-TASK-20260308-000');
    });

    it('handles invalid sequence as 0', () => {
      expect(formatDocumentId('LOT', 'TASK', '20260308', NaN)).toBe('LOT-TASK-20260308-000');
      expect(formatDocumentId('LOT', 'TASK', '20260308', 'x')).toBe('LOT-TASK-20260308-000');
    });
  });

  describe('parseDocumentId', () => {
    it('parses valid document ID', () => {
      expect(parseDocumentId('LOT-TASK-20260308-001')).toEqual({
        orgPrefix: 'LOT',
        docPrefix: 'TASK',
        date: '20260308',
        sequence: 1,
      });
      expect(parseDocumentId('ABC-INV-20250101-042')).toEqual({
        orgPrefix: 'ABC',
        docPrefix: 'INV',
        date: '20250101',
        sequence: 42,
      });
    });

    it('returns null for empty or non-string', () => {
      expect(parseDocumentId('')).toBeNull();
      expect(parseDocumentId(null)).toBeNull();
      expect(parseDocumentId(undefined)).toBeNull();
      expect(parseDocumentId(123)).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(parseDocumentId('LOT-TASK-20260308')).toBeNull();
      expect(parseDocumentId('LOT-TASK-20260308-')).toBeNull();
      expect(parseDocumentId('lot-task-20260308-001')).toBeNull();
      expect(parseDocumentId('LOT-TASK-20260308-001-extra')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(parseDocumentId('  LOT-TASK-20260308-001  ')).toEqual({
        orgPrefix: 'LOT',
        docPrefix: 'TASK',
        date: '20260308',
        sequence: 1,
      });
    });
  });

  describe('round-trip', () => {
    it('parse(format(...)) recovers sequence and prefix', () => {
      const id = formatDocumentId('LOT', 'TASK', '20260308', 99);
      const parsed = parseDocumentId(id);
      expect(parsed.sequence).toBe(99);
      expect(parsed.orgPrefix).toBe('LOT');
      expect(parsed.docPrefix).toBe('TASK');
      expect(parsed.date).toBe('20260308');
    });
  });
});
