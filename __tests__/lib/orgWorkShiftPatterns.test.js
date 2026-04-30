import {
  WEEKDAY_SHORT,
  weekdayLabel,
  jsGetDayToDbWeekday,
  timeToInputValue,
  fetchWorkShiftsForMember,
  fetchAllWorkShiftsForOrg,
  replaceWorkShiftsForMember,
} from '@/lib/orgWorkShiftPatterns';

describe('orgWorkShiftPatterns', () => {
  it('exposes weekday short labels Mon–Sun', () => {
    expect(WEEKDAY_SHORT).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  describe('weekdayLabel', () => {
    it('returns short label for 0–6', () => {
      expect(weekdayLabel(0)).toBe('Mon');
      expect(weekdayLabel(6)).toBe('Sun');
    });

    it('stringifies out-of-range indices', () => {
      expect(weekdayLabel(99)).toBe('99');
    });
  });

  describe('jsGetDayToDbWeekday', () => {
    it('maps JS Sunday to 6 and Monday to 0', () => {
      expect(jsGetDayToDbWeekday(0)).toBe(6);
      expect(jsGetDayToDbWeekday(1)).toBe(0);
      expect(jsGetDayToDbWeekday(6)).toBe(5);
    });
  });

  describe('timeToInputValue', () => {
    it('returns default for null or empty', () => {
      expect(timeToInputValue(null)).toBe('09:00');
      expect(timeToInputValue('')).toBe('09:00');
    });

    it('truncates to HH:MM when seconds present', () => {
      expect(timeToInputValue('14:30:00')).toBe('14:30');
      expect(timeToInputValue('09:05:59')).toBe('09:05');
    });

    it('returns short strings as-is when under 5 chars', () => {
      expect(timeToInputValue('9')).toBe('9');
    });
  });

  describe('fetchWorkShiftsForMember', () => {
    it('returns data rows from Supabase', async () => {
      const rows = [{ id: '1', weekday: 0, start_time: '09:00:00', end_time: '17:00:00' }];
      const inner = { order: jest.fn(() => Promise.resolve({ data: rows, error: null })) };
      const orderWeekday = { order: jest.fn(() => inner) };
      const eq2 = { eq: jest.fn(() => orderWeekday) };
      const eq1 = { eq: jest.fn(() => eq2) };
      const select = { select: jest.fn(() => eq1) };
      const supabase = { from: jest.fn(() => select) };

      const out = await fetchWorkShiftsForMember(supabase, { organizationId: 'o1', userId: 'u1' });
      expect(supabase.from).toHaveBeenCalledWith('org_work_shift_patterns');
      expect(out).toEqual(rows);
    });

    it('throws on error', async () => {
      const inner = { order: jest.fn(() => Promise.resolve({ data: null, error: { code: 'x' } })) };
      const orderWeekday = { order: jest.fn(() => inner) };
      const eq2 = { eq: jest.fn(() => orderWeekday) };
      const eq1 = { eq: jest.fn(() => eq2) };
      const select = { select: jest.fn(() => eq1) };
      const supabase = { from: jest.fn(() => select) };

      await expect(fetchWorkShiftsForMember(supabase, { organizationId: 'o', userId: 'u' })).rejects.toEqual({
        code: 'x',
      });
    });
  });

  describe('fetchAllWorkShiftsForOrg', () => {
    it('orders by user, weekday, and start time', async () => {
      const tripleOrder = {
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
      const doubleOrder = { order: jest.fn(() => tripleOrder) };
      const singleOrder = { order: jest.fn(() => doubleOrder) };
      const eq = { eq: jest.fn(() => singleOrder) };
      const select = { select: jest.fn(() => eq) };
      const supabase = { from: jest.fn(() => select) };

      await fetchAllWorkShiftsForOrg(supabase, { organizationId: 'org-x' });
      expect(supabase.from).toHaveBeenCalledWith('org_work_shift_patterns');
      expect(eq.eq).toHaveBeenCalledWith('organization_id', 'org-x');
    });
  });

  describe('replaceWorkShiftsForMember', () => {
    function buildSupabase() {
      let insertedPayload;
      const tableApi = {
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }),
        insert: (payload) => {
          insertedPayload = payload;
          return Promise.resolve({ error: null });
        },
      };
      const supabase = {
        from: jest.fn(() => tableApi),
        getInsertedPayload: () => insertedPayload,
      };
      return supabase;
    }

    it('deletes existing rows then inserts cleaned rows with PG time format', async () => {
      const supabase = buildSupabase();
      await replaceWorkShiftsForMember(supabase, {
        organizationId: 'org-1',
        userId: 'user-1',
        rows: [
          { weekday: 0, startTime: '09:00', endTime: '17:30' },
          { weekday: 99, startTime: '10:00', endTime: '11:00' },
          { weekday: 1, startTime: '12:00', endTime: '11:00' },
        ],
      });
      const payload = supabase.getInsertedPayload();
      expect(payload).toHaveLength(1);
      expect(payload[0]).toMatchObject({
        organization_id: 'org-1',
        user_id: 'user-1',
        weekday: 0,
        start_time: '09:00:00',
        end_time: '17:30:00',
      });
    });

    it('uses default time when HH:MM regex does not match (e.g. single minute digit)', async () => {
      const supabase = buildSupabase();
      await replaceWorkShiftsForMember(supabase, {
        organizationId: 'o',
        userId: 'u',
        rows: [{ weekday: 2, startTime: '12:3', endTime: '18:00' }],
      });
      expect(supabase.getInsertedPayload()[0].start_time).toBe('09:00:00');
      expect(supabase.getInsertedPayload()[0].end_time).toBe('18:00:00');
    });

    it('does not call insert when no valid rows remain', async () => {
      const insert = jest.fn(() => Promise.resolve({ error: null }));
      const supabase = {
        from: jest.fn(() => ({
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
          insert,
        })),
      };
      await replaceWorkShiftsForMember(supabase, {
        organizationId: 'o',
        userId: 'u',
        rows: [],
      });
      expect(insert).not.toHaveBeenCalled();
    });

    it('throws when delete fails', async () => {
      const supabase = {
        from: jest.fn(() => ({
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: { message: 'denied' } }),
            }),
          }),
        })),
      };
      await expect(
        replaceWorkShiftsForMember(supabase, {
          organizationId: 'o',
          userId: 'u',
          rows: [{ weekday: 0, startTime: '09:00', endTime: '10:00' }],
        })
      ).rejects.toEqual({ message: 'denied' });
    });
  });
});
