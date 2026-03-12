/**
 * Unit tests for utils/dateTimeFormatters.js
 */
import {
  formatDate,
  formatTime,
  parseFormattedDate,
  parseFormattedTime,
  getDateInTimezone,
  getTimeInTimezone,
  formatDateFromISO,
  formatDateTimeFromISO,
} from '@/utils/dateTimeFormatters';

describe('dateTimeFormatters', () => {
  describe('formatDate', () => {
    it('returns empty string when dateString is falsy', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
    });

    it('returns dateString when not YYYY-MM-DD (parts.length !== 3)', () => {
      expect(formatDate('2025-01')).toBe('2025-01');
    });

    it('formats MM/DD/YYYY', () => {
      const result = formatDate('2025-03-12', 'MM/DD/YYYY', 'UTC');
      expect(result).toMatch(/\d{2}\/\d{2}\/2025/);
    });

    it('formats DD/MM/YYYY', () => {
      const result = formatDate('2025-03-12', 'DD/MM/YYYY', 'UTC');
      expect(result).toMatch(/\d{2}\/\d{2}\/2025/);
    });

    it('formats YYYY-MM-DD', () => {
      const result = formatDate('2025-03-12', 'YYYY-MM-DD', 'UTC');
      expect(result).toBe('2025-03-12');
    });

    it('formats DD MMM YYYY', () => {
      const result = formatDate('2025-03-12', 'DD MMM YYYY', 'UTC');
      expect(result).toMatch(/\d{2} \w{3} 2025/);
    });

    it('uses default format for unknown', () => {
      const result = formatDate('2025-03-12', 'OTHER', 'UTC');
      expect(result).toMatch(/2025/);
    });
  });

  describe('formatTime', () => {
    it('returns empty string when timeString is falsy', () => {
      expect(formatTime('')).toBe('');
    });

    it('formats 24h as-is', () => {
      expect(formatTime('14:30', '24h')).toBe('14:30');
    });

    it('formats 12h with AM/PM', () => {
      expect(formatTime('09:30', '12h')).toBe('9:30 AM');
      expect(formatTime('14:30', '12h')).toBe('2:30 PM');
      expect(formatTime('00:00', '12h')).toBe('12:00 AM');
      expect(formatTime('12:00', '12h')).toBe('12:00 PM');
    });
  });

  describe('parseFormattedDate', () => {
    it('returns empty string when formattedDate is falsy', () => {
      expect(parseFormattedDate('')).toBe('');
    });

    it('parses MM/DD/YYYY', () => {
      expect(parseFormattedDate('03/12/2025', 'MM/DD/YYYY')).toBe('2025-03-12');
    });

    it('parses DD/MM/YYYY', () => {
      expect(parseFormattedDate('12/03/2025', 'DD/MM/YYYY')).toBe('2025-03-12');
    });

    it('returns as-is for YYYY-MM-DD', () => {
      expect(parseFormattedDate('2025-03-12', 'YYYY-MM-DD')).toBe('2025-03-12');
    });

    it('parses DD MMM YYYY via Date', () => {
      const result = parseFormattedDate('12 Mar 2025', 'DD MMM YYYY');
      expect(result).toBe('2025-03-12');
    });

    it('returns empty when no match for MM/DD/YYYY', () => {
      expect(parseFormattedDate('invalid', 'MM/DD/YYYY')).toBe('');
    });

    it('default format parses via Date', () => {
      const result = parseFormattedDate('March 12, 2025', 'OTHER');
      expect(result).toMatch(/2025-03-12/);
    });

    it('returns empty and logs on parse error', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = parseFormattedDate(123, 'MM/DD/YYYY');
      expect(result).toBe('');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('parseFormattedTime', () => {
    it('returns empty when formattedTime is falsy', () => {
      expect(parseFormattedTime('')).toBe('');
    });

    it('parses 12h AM/PM', () => {
      expect(parseFormattedTime('9:30 AM', '12h')).toBe('09:30');
      expect(parseFormattedTime('2:30 PM', '12h')).toBe('14:30');
      expect(parseFormattedTime('12:00 AM', '12h')).toBe('00:00');
      expect(parseFormattedTime('12:00 PM', '12h')).toBe('12:00');
    });

    it('parses 24h style', () => {
      expect(parseFormattedTime('14:30', '24h')).toBe('14:30');
    });

    it('returns formattedTime when no match', () => {
      expect(parseFormattedTime('noon', '24h')).toBe('noon');
    });
  });

  describe('getDateInTimezone', () => {
    it('returns empty when iso is falsy', () => {
      expect(getDateInTimezone('')).toBe('');
    });

    it('returns empty for invalid ISO', () => {
      expect(getDateInTimezone('invalid')).toBe('');
    });

    it('returns YYYY-MM-DD in timezone', () => {
      const result = getDateInTimezone('2025-03-12T00:00:00.000Z', 'UTC');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getTimeInTimezone', () => {
    it('returns empty when iso is falsy', () => {
      expect(getTimeInTimezone('')).toBe('');
    });

    it('returns empty for invalid ISO', () => {
      expect(getTimeInTimezone('invalid')).toBe('');
    });

    it('returns HH:MM in timezone', () => {
      const result = getTimeInTimezone('2025-03-12T14:30:00.000Z', 'UTC');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDateFromISO', () => {
    it('uses getDateInTimezone and formatDate', () => {
      const result = formatDateFromISO('2025-03-12T12:00:00.000Z', 'MM/DD/YYYY', 'UTC');
      expect(result).toMatch(/2025|\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('formatDateTimeFromISO', () => {
    it('returns empty when iso is falsy', () => {
      expect(formatDateTimeFromISO('')).toBe('');
    });

    it('returns date and time formatted', () => {
      const result = formatDateTimeFromISO('2025-03-12T14:30:00.000Z', 'MM/DD/YYYY', '24h', 'UTC');
      expect(result).toMatch(/\d{2}\/\d{2}\/2025/);
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
