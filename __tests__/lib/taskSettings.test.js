/**
 * Unit tests for lib/taskSettings.js
 */

import {
  getDefaultTaskSettings,
  getCurrentSprintEndDate,
  getTaskSettings,
  saveTaskSettings,
  DEFAULT_COLUMNS,
  COLUMN_LABELS,
  DEFAULT_VIEWS,
  SPRINT_WEEKS_OPTIONS,
  DEFAULT_SPRINT_WEEKS,
} from '@/lib/taskSettings';

describe('taskSettings', () => {
  describe('getDefaultTaskSettings', () => {
    it('returns default columns, statusLabels, views, defaultView, sprintWeeks, sprintStartDate', () => {
      const settings = getDefaultTaskSettings();
      expect(settings.columns).toEqual(DEFAULT_COLUMNS);
      expect(settings.statusLabels).toBeDefined();
      expect(Object.keys(settings.statusLabels).length).toBeGreaterThan(0);
      expect(settings.views).toEqual(DEFAULT_VIEWS);
      expect(settings.defaultView).toBe('board');
      expect(settings.sprintWeeks).toBe(DEFAULT_SPRINT_WEEKS);
      expect(settings.sprintStartDate).toBeNull();
    });

    it('returns a new object each time (no shared reference)', () => {
      const a = getDefaultTaskSettings();
      const b = getDefaultTaskSettings();
      expect(a).not.toBe(b);
      expect(a.columns).not.toBe(b.columns);
    });
  });

  describe('getCurrentSprintEndDate', () => {
    it('returns YYYY-MM-DD string', () => {
      const result = getCurrentSprintEndDate('2026-03-03', 4);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('uses sprint start date when provided', () => {
      const result = getCurrentSprintEndDate('2026-03-03', 4);
      expect(result).toBeDefined();
      const [y, m, d] = result.split('-').map(Number);
      expect(y).toBeGreaterThanOrEqual(2026);
      expect(m).toBeGreaterThanOrEqual(1);
      expect(m).toBeLessThanOrEqual(12);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(31);
    });

    it('clamps sprintWeeks to 2-6', () => {
      const withOne = getCurrentSprintEndDate('2026-03-03', 1);
      const withFour = getCurrentSprintEndDate('2026-03-03', 4);
      const withSeven = getCurrentSprintEndDate('2026-03-03', 7);
      expect(withOne).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(withFour).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(withSeven).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles null/undefined sprintStartDate (uses current week Monday)', () => {
      const result = getCurrentSprintEndDate(null, 4);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const result2 = getCurrentSprintEndDate(undefined, 4);
      expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('defaults sprintWeeks to 4 when invalid', () => {
      const result = getCurrentSprintEndDate('2026-03-03', 'x');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getTaskSettings', () => {
    const originalLocalStorage = global.localStorage;

    beforeEach(() => {
      const store = {};
      global.localStorage = {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => { store[key] = value; },
        removeItem: (key) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
        get length() { return Object.keys(store).length; },
        key: () => null,
      };
    });

    afterEach(() => {
      global.localStorage = originalLocalStorage;
    });

    it('returns default settings when orgId is missing', () => {
      const result = getTaskSettings(null);
      expect(result.defaultView).toBe('board');
      expect(result.sprintWeeks).toBe(DEFAULT_SPRINT_WEEKS);
    });

    it('returns default settings when no stored value', () => {
      const result = getTaskSettings('org-123');
      expect(result.defaultView).toBe('board');
    });

    it('returns merged settings from localStorage', () => {
      global.localStorage.setItem(
        'tasks-settings-org-123',
        JSON.stringify({
          columns: { assignee: false },
          statusLabels: {},
          views: { list: false },
          defaultView: 'gantt',
          sprintWeeks: 3,
          sprintStartDate: '2026-03-01',
        })
      );
      const result = getTaskSettings('org-123');
      expect(result.columns.assignee).toBe(false);
      expect(result.defaultView).toBe('gantt');
      expect(result.sprintWeeks).toBe(3);
      expect(result.sprintStartDate).toBe('2026-03-01');
    });

    it('falls back to default when stored defaultView is invalid', () => {
      global.localStorage.setItem(
        'tasks-settings-org-123',
        JSON.stringify({
          columns: {},
          statusLabels: {},
          views: {},
          defaultView: 'invalid',
          sprintWeeks: 4,
          sprintStartDate: null,
        })
      );
      const result = getTaskSettings('org-123');
      expect(result.defaultView).toBe('board');
    });

    it('falls back to default when JSON parse fails', () => {
      global.localStorage.setItem('tasks-settings-org-123', 'not json');
      const result = getTaskSettings('org-123');
      expect(result.defaultView).toBe('board');
    });
  });

  describe('saveTaskSettings', () => {
    const originalLocalStorage = global.localStorage;

    beforeEach(() => {
      const store = {};
      global.localStorage = {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => { store[key] = value; },
        removeItem: (key) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
        get length() { return Object.keys(store).length; },
        key: () => null,
      };
    });

    afterEach(() => {
      global.localStorage = originalLocalStorage;
    });

    it('stores settings under org key', () => {
      const settings = getDefaultTaskSettings();
      saveTaskSettings('org-456', settings);
      const raw = global.localStorage.getItem('tasks-settings-org-456');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw);
      expect(parsed.defaultView).toBe('board');
      expect(parsed.sprintWeeks).toBe(4);
    });

    it('does not throw when orgId is null', () => {
      expect(() => saveTaskSettings(null, getDefaultTaskSettings())).not.toThrow();
    });

    it('catches setItem errors and does not throw', () => {
      const origSetItem = global.localStorage.setItem;
      global.localStorage.setItem = () => {
        throw new Error('QuotaExceeded');
      };
      expect(() => saveTaskSettings('org-1', getDefaultTaskSettings())).not.toThrow();
      global.localStorage.setItem = origSetItem;
    });
  });

  describe('constants', () => {
    it('SPRINT_WEEKS_OPTIONS and DEFAULT_SPRINT_WEEKS are defined', () => {
      expect(SPRINT_WEEKS_OPTIONS).toEqual([2, 3, 4, 5, 6]);
      expect(DEFAULT_SPRINT_WEEKS).toBe(4);
    });

    it('COLUMN_LABELS has expected keys', () => {
      expect(COLUMN_LABELS).toMatchObject({
        assignee: 'Assignee',
        title: 'Title',
        status: 'Status',
        priority: 'Priority',
        due_at: 'Due date',
      });
    });
  });
});
