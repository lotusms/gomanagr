/**
 * Unit tests for utils/documentIds.js (client)
 */

import {
  formatDocumentId,
  parseDocumentId,
  isStructuredDocumentId,
  DOCUMENT_ID_PREFIX,
} from '@/utils/documentIds';

describe('documentIds', () => {
  describe('DOCUMENT_ID_PREFIX', () => {
    it('exports expected prefixes', () => {
      expect(DOCUMENT_ID_PREFIX.PROP).toBe('PROP');
      expect(DOCUMENT_ID_PREFIX.INV).toBe('INV');
      expect(DOCUMENT_ID_PREFIX.CONT).toBe('CONT');
    });
  });

  describe('formatDocumentId', () => {
    it('formats org prefix, doc prefix, date, and sequence', () => {
      expect(formatDocumentId('LOT', 'PROP', '20260308', 1)).toBe('LOT-PROP-20260308-001');
      expect(formatDocumentId('ABC', 'INV', '20250101', 999)).toBe('ABC-INV-20250101-999');
    });

    it('normalizes date with dashes to 8 digits', () => {
      expect(formatDocumentId('LOT', 'PROP', '2026-03-08', 1)).toBe('LOT-PROP-20260308-001');
    });

    it('pads sequence to 3 digits', () => {
      expect(formatDocumentId('LOT', 'PROP', '20260308', 0)).toBe('LOT-PROP-20260308-000');
    });

    it('uses X for org prefix when empty or short', () => {
      expect(formatDocumentId('', 'PROP', '20260308', 1)).toBe('XXX-PROP-20260308-001');
    });

    it('clamps sequence to non-negative', () => {
      expect(formatDocumentId('LOT', 'PROP', '20260308', -5)).toBe('LOT-PROP-20260308-000');
    });
  });

  describe('parseDocumentId', () => {
    it('parses valid document ID', () => {
      expect(parseDocumentId('LOT-PROP-20260308-001')).toEqual({
        orgPrefix: 'LOT',
        docPrefix: 'PROP',
        date: '20260308',
        sequence: 1,
      });
    });

    it('returns null for empty or non-string', () => {
      expect(parseDocumentId('')).toBeNull();
      expect(parseDocumentId(null)).toBeNull();
      expect(parseDocumentId(123)).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(parseDocumentId('LOT-PROP-20260308')).toBeNull();
      expect(parseDocumentId('lot-prop-20260308-001')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(parseDocumentId('  LOT-PROP-20260308-001  ')).toEqual({
        orgPrefix: 'LOT',
        docPrefix: 'PROP',
        date: '20260308',
        sequence: 1,
      });
    });
  });

  describe('isStructuredDocumentId', () => {
    it('returns true for valid ID', () => {
      expect(isStructuredDocumentId('STA-PROP-20260303-002')).toBe(true);
    });

    it('returns false for invalid or empty', () => {
      expect(isStructuredDocumentId('')).toBe(false);
      expect(isStructuredDocumentId('nope')).toBe(false);
      expect(isStructuredDocumentId(null)).toBe(false);
    });
  });
});
