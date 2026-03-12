/**
 * Unit tests for utils/appointmentRecurrence.js: expandRecurrence, expandAppointmentWithRecurrence,
 * getRecurrenceBaseId, isRecurrenceOccurrenceId, getRecurrenceSeriesFromDate, isPartOfRecurringSeries
 */
import {
  expandRecurrence,
  expandAppointmentWithRecurrence,
  getRecurrenceBaseId,
  isRecurrenceOccurrenceId,
  getRecurrenceSeriesFromDate,
  isPartOfRecurringSeries,
} from '@/utils/appointmentRecurrence';

describe('appointmentRecurrence', () => {
  describe('expandRecurrence', () => {
    it('returns [] when recurrence is null or missing isRecurring', () => {
      expect(expandRecurrence(null)).toEqual([]);
      expect(expandRecurrence({})).toEqual([]);
      expect(expandRecurrence({ isRecurring: false, recurrenceStart: '2025-01-01' })).toEqual([]);
    });

    it('returns [] when recurrenceStart is missing or invalid', () => {
      expect(expandRecurrence({ isRecurring: true })).toEqual([]);
      expect(expandRecurrence({ isRecurring: true, recurrenceStart: '' })).toEqual([]);
      expect(expandRecurrence({ isRecurring: true, recurrenceStart: 'invalid' })).toEqual([]);
      expect(expandRecurrence({ isRecurring: true, recurrenceStart: '2025-00-01' })).toEqual([]);
    });

    it('returns [start] only when recurrenceEnd is invalid and not noEndDate', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: 'bad',
      });
      expect(result).toEqual(['2025-01-06']);
    });

    it('daily: includes every day in range', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: '2025-01-10',
        frequency: 'daily',
      });
      expect(result).toEqual(['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']);
    });

    it('weekly: includes same weekday only', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: '2025-01-27',
        frequency: 'weekly',
      });
      expect(result).toEqual(['2025-01-06', '2025-01-13', '2025-01-20', '2025-01-27']);
    });

    it('specific_days: includes only days in specificDays (0=Sun, 1=Mon, ...)', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: '2025-01-12',
        frequency: 'specific_days',
        specificDays: [1, 3],
      });
      expect(result).toContain('2025-01-06');
      expect(result).toContain('2025-01-08');
      expect(result.every((d) => {
        const day = new Date(d + 'T12:00:00').getDay();
        return day === 1 || day === 3;
      })).toBe(true);
    });

    it('specific_days: includes none when specificDays empty', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: '2025-01-10',
        frequency: 'specific_days',
        specificDays: [],
      });
      expect(result).toEqual([]);
    });

    it('monthly: includes same day of month', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-15',
        recurrenceEnd: '2025-04-15',
        frequency: 'monthly',
        monthlyDay: 15,
      });
      expect(result).toEqual(['2025-01-15', '2025-02-15', '2025-03-15', '2025-04-15']);
    });

    it('monthly: clamps monthlyDay to 1-31', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-31',
        recurrenceEnd: '2025-02-28',
        frequency: 'monthly',
        monthlyDay: 32,
      });
      expect(result).toContain('2025-01-31');
    });

    it('yearly: includes same month and date', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-03-12',
        recurrenceEnd: '2027-03-12',
        frequency: 'yearly',
      });
      expect(result).toEqual(['2025-03-12', '2026-03-12', '2027-03-12']);
    });

    it('default frequency when not provided is weekly', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: '2025-01-13',
      });
      expect(result).toEqual(['2025-01-06', '2025-01-13']);
    });

    it('noEndDate: caps at MAX_DAYS_NO_END (2 years)', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-01',
        noEndDate: true,
        frequency: 'daily',
      });
      expect(result.length).toBeLessThanOrEqual(500);
      expect(result[0]).toBe('2025-01-01');
    });

    it('recurrenceEnd null or empty uses cap', () => {
      const result = expandRecurrence({
        isRecurring: true,
        recurrenceStart: '2025-01-01',
        recurrenceEnd: null,
        frequency: 'daily',
      });
      expect(result.length).toBeGreaterThan(1);
      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('expandAppointmentWithRecurrence', () => {
    it('returns [baseAppointment] when expandRecurrence returns empty', () => {
      const base = { id: 'apt-1', start: '09:00', end: '10:00' };
      const result = expandAppointmentWithRecurrence(base, { isRecurring: false });
      expect(result).toEqual([base]);
    });

    it('returns one item with same id when only one date', () => {
      const base = { id: 'apt-1', start: '09:00', end: '10:00', staffId: 's1' };
      const result = expandAppointmentWithRecurrence(base, {
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: '2025-01-06',
        frequency: 'daily',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('apt-1');
      expect(result[0].date).toBe('2025-01-06');
      expect(result[0].start).toBe('09:00');
      expect(result[0].staffId).toBe('s1');
    });

    it('returns multiple with suffix id when multiple dates', () => {
      const base = { id: 'apt-1', start: '09:00', end: '10:00' };
      const result = expandAppointmentWithRecurrence(base, {
        isRecurring: true,
        recurrenceStart: '2025-01-06',
        recurrenceEnd: '2025-01-08',
        frequency: 'daily',
      });
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('apt-1-0-2025-01-06');
      expect(result[1].id).toBe('apt-1-1-2025-01-07');
      expect(result[2].id).toBe('apt-1-2-2025-01-08');
      result.forEach((r, i) => {
        expect(r.date).toBe(['2025-01-06', '2025-01-07', '2025-01-08'][i]);
        expect(r.updatedAt).toBeDefined();
      });
    });

    it('uses base id from baseAppointment or generated', () => {
      const result = expandAppointmentWithRecurrence(
        { start: '09:00', end: '10:00' },
        { isRecurring: true, recurrenceStart: '2025-01-06', recurrenceEnd: '2025-01-07', frequency: 'daily' }
      );
      expect(result[0].id).toMatch(/^apt-\d+-0-2025-01-06$/);
    });
  });

  describe('getRecurrenceBaseId', () => {
    it('returns null for falsy or non-string', () => {
      expect(getRecurrenceBaseId(null)).toBeNull();
      expect(getRecurrenceBaseId('')).toBeNull();
      expect(getRecurrenceBaseId(123)).toBeNull();
    });

    it('returns base id when suffix matches -index-YYYY-MM-DD', () => {
      expect(getRecurrenceBaseId('apt-123-0-2026-05-12')).toBe('apt-123');
      expect(getRecurrenceBaseId('apt-1-2-2025-01-06')).toBe('apt-1');
    });

    it('returns null when id has no recurrence suffix', () => {
      expect(getRecurrenceBaseId('apt-123')).toBeNull();
      expect(getRecurrenceBaseId('apt-123-0')).toBeNull();
    });
  });

  describe('isRecurrenceOccurrenceId', () => {
    it('returns true when getRecurrenceBaseId returns non-null', () => {
      expect(isRecurrenceOccurrenceId('apt-1-0-2025-01-06')).toBe(true);
    });

    it('returns false when getRecurrenceBaseId returns null', () => {
      expect(isRecurrenceOccurrenceId('apt-1')).toBe(false);
    });
  });

  describe('getRecurrenceSeriesFromDate', () => {
    it('returns [] when baseId or fromDate missing or appointments not array', () => {
      expect(getRecurrenceSeriesFromDate([], 'apt-1', '2025-01-01')).toEqual([]);
      expect(getRecurrenceSeriesFromDate([{ id: 'apt-1-0-2025-01-06' }], '', '2025-01-01')).toEqual([]);
      expect(getRecurrenceSeriesFromDate([{ id: 'apt-1-0-2025-01-06' }], 'apt-1', '')).toEqual([]);
      expect(getRecurrenceSeriesFromDate(null, 'apt-1', '2025-01-01')).toEqual([]);
    });

    it('returns same-series appointments with date >= fromDate', () => {
      const appointments = [
        { id: 'apt-1-0-2025-01-06', date: '2025-01-06' },
        { id: 'apt-1-1-2025-01-07', date: '2025-01-07' },
        { id: 'apt-1-2-2025-01-08', date: '2025-01-08' },
        { id: 'apt-2-0-2025-01-06', date: '2025-01-06' },
      ];
      const result = getRecurrenceSeriesFromDate(appointments, 'apt-1', '2025-01-07');
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.id)).toEqual(['apt-1-1-2025-01-07', 'apt-1-2-2025-01-08']);
    });

    it('includes base id when apt.id === baseId', () => {
      const appointments = [
        { id: 'apt-1', date: '2025-01-06' },
      ];
      const result = getRecurrenceSeriesFromDate(appointments, 'apt-1', '2025-01-06');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('apt-1');
    });

    it('handles apt.date as ISO string (splits on T)', () => {
      const appointments = [{ id: 'apt-1-0-2025-01-06', date: '2025-01-06T00:00:00.000Z' }];
      const result = getRecurrenceSeriesFromDate(appointments, 'apt-1', '2025-01-06');
      expect(result).toHaveLength(1);
    });
  });

  describe('isPartOfRecurringSeries', () => {
    it('returns false when appointment has no recurrence base id', () => {
      expect(isPartOfRecurringSeries({ id: 'apt-1' }, [{ id: 'apt-1' }])).toBe(false);
    });

    it('returns false when only one in series', () => {
      expect(isPartOfRecurringSeries(
        { id: 'apt-1-0-2025-01-06' },
        [{ id: 'apt-1-0-2025-01-06' }]
      )).toBe(false);
    });

    it('returns true when multiple in same series', () => {
      expect(isPartOfRecurringSeries(
        { id: 'apt-1-0-2025-01-06' },
        [
          { id: 'apt-1-0-2025-01-06' },
          { id: 'apt-1-1-2025-01-07' },
        ]
      )).toBe(true);
    });

    it('returns false when appointment is null/undefined', () => {
      expect(isPartOfRecurringSeries(null, [])).toBe(false);
    });
  });
});
