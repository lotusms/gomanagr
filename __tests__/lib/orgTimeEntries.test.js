import {
  toLocalYmd,
  getMondayWeekRange,
  mapTimeEntryRowToGridEntry,
  fetchOrgTimeEntriesForWeek,
} from '@/lib/orgTimeEntries';

describe('orgTimeEntries', () => {
  describe('toLocalYmd', () => {
    it('formats local calendar date as YYYY-MM-DD', () => {
      expect(toLocalYmd(new Date(2025, 0, 5))).toBe('2025-01-05');
      expect(toLocalYmd(new Date(2025, 11, 31))).toBe('2025-12-31');
    });
  });

  describe('getMondayWeekRange', () => {
    it('returns Monday–Sunday for a Wednesday anchor', () => {
      const anchor = new Date(2025, 0, 15, 15, 30, 0);
      const { weekStart, weekEnd, dayYmds, startYmd, endYmd } = getMondayWeekRange(anchor);
      expect(toLocalYmd(weekStart)).toBe('2025-01-13');
      expect(dayYmds).toHaveLength(7);
      expect(dayYmds[0]).toBe('2025-01-13');
      expect(dayYmds[6]).toBe('2025-01-19');
      expect(startYmd).toBe('2025-01-13');
      expect(endYmd).toBe('2025-01-19');
      expect(toLocalYmd(weekEnd)).toBe('2025-01-19');
    });

    it('treats Sunday as end of week and Monday as start when anchor is Sunday', () => {
      const anchor = new Date(2025, 0, 19, 12, 0, 0);
      const { dayYmds } = getMondayWeekRange(anchor);
      expect(dayYmds[0]).toBe('2025-01-13');
      expect(dayYmds[6]).toBe('2025-01-19');
    });
  });

  describe('mapTimeEntryRowToGridEntry', () => {
    const dayYmds = ['2025-01-13', '2025-01-14', '2025-01-15'];

    it('returns null when work_date is outside the week', () => {
      expect(
        mapTimeEntryRowToGridEntry(
          { id: '1', work_date: '2025-02-01', hours: 1, status: 'draft', entry_method: 'manual' },
          dayYmds
        )
      ).toBeNull();
    });

    it('maps a string work_date and normalizes labels', () => {
      const row = {
        id: 'e1',
        work_date: '2025-01-14',
        hours: 2.5,
        notes: '  note  ',
        status: 'SUBMITTED',
        entry_method: 'TIMER',
        billable: false,
        costable: true,
        linked_entity_type: 'client',
        linked_label: ' Acme ',
      };
      const mapped = mapTimeEntryRowToGridEntry(row, dayYmds);
      expect(mapped).toMatchObject({
        id: 'e1',
        dayIndex: 1,
        hours: 2.5,
        linkedType: 'Client',
        linkedLabel: 'Acme',
        method: 'Timer',
        status: 'Submitted',
        billable: false,
        costable: true,
        notes: 'note',
      });
    });

    it('maps Date work_date using local YMD', () => {
      const row = {
        id: 'e2',
        work_date: new Date(2025, 0, 15),
        hours: 1,
        status: 'approved',
        entry_method: 'clock',
        linked_entity_type: 'internal',
      };
      const mapped = mapTimeEntryRowToGridEntry(row, dayYmds);
      expect(mapped?.dayIndex).toBe(2);
      expect(mapped?.status).toBe('Approved');
      expect(mapped?.method).toBe('Clock');
      expect(mapped?.linkedType).toBe('Internal');
    });

    it('uses unknown linked type capitalization and draft defaults', () => {
      const row = {
        id: 'e3',
        work_date: '2025-01-13',
        hours: 0,
        linked_entity_type: 'customThing',
      };
      const mapped = mapTimeEntryRowToGridEntry(row, dayYmds);
      expect(mapped?.linkedType).toBe('CustomThing');
      expect(mapped?.status).toBe('Draft');
      expect(mapped?.method).toBe('Manual');
    });
  });

  describe('fetchOrgTimeEntriesForWeek', () => {
    function supabaseWithRows(rows, error = null) {
      const inner = {
        order: jest.fn(() => Promise.resolve({ data: rows, error })),
      };
      const mid = { order: jest.fn(() => inner) };
      const lte = { lte: jest.fn(() => mid) };
      const gte = { gte: jest.fn(() => lte) };
      const eq2 = { eq: jest.fn(() => gte) };
      const eq1 = { eq: jest.fn(() => eq2) };
      const select = { select: jest.fn(() => eq1) };
      return {
        from: jest.fn(() => select),
      };
    }

    it('returns mapped rows and skips entries outside dayYmds', async () => {
      const dayYmds = ['2025-01-13', '2025-01-14'];
      const supabase = supabaseWithRows([
        { id: 'a', work_date: '2025-01-13', hours: 1, status: 'draft', entry_method: 'manual' },
        { id: 'b', work_date: '2025-01-20', hours: 9, status: 'draft', entry_method: 'manual' },
      ]);
      const out = await fetchOrgTimeEntriesForWeek(supabase, {
        organizationId: 'org-1',
        userId: 'user-1',
        startYmd: '2025-01-13',
        endYmd: '2025-01-14',
        dayYmds,
      });
      expect(supabase.from).toHaveBeenCalledWith('org_time_entries');
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe('a');
    });

    it('throws when Supabase returns an error', async () => {
      const supabase = supabaseWithRows(null, { message: 'boom' });
      await expect(
        fetchOrgTimeEntriesForWeek(supabase, {
          organizationId: 'o',
          userId: 'u',
          startYmd: '2025-01-01',
          endYmd: '2025-01-07',
          dayYmds: ['2025-01-01'],
        })
      ).rejects.toEqual({ message: 'boom' });
    });
  });
});
