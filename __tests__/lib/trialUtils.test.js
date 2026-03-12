/**
 * Unit tests for lib/trialUtils.js
 */

import { getTrialStatus, calculateTrialEndDate } from '@/lib/trialUtils';

describe('trialUtils', () => {
  describe('getTrialStatus', () => {
    it('returns not expired when userAccount is null or undefined', () => {
      expect(getTrialStatus(null)).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
      expect(getTrialStatus(undefined)).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
    });

    it('returns not expired when userAccount.trial is not true', () => {
      expect(getTrialStatus({ trial: false })).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
      expect(getTrialStatus({})).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
    });

    it('returns expired when trial is true and trialEndsAt is in the past', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const result = getTrialStatus({ trial: true, trialEndsAt: past.toISOString() });
      expect(result.expired).toBe(true);
      expect(result.daysRemaining).toBe(0);
      expect(result.trialEndsAt).toBeInstanceOf(Date);
    });

    it('returns not expired when trial is true and trialEndsAt is in the future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const result = getTrialStatus({ trial: true, trialEndsAt: future.toISOString() });
      expect(result.expired).toBe(false);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(1);
    });

    it('returns expired when trial is true and no trialEndsAt or createdAt', () => {
      const result = getTrialStatus({ trial: true });
      expect(result).toEqual({ expired: true, daysRemaining: 0, trialEndsAt: null });
    });
  });

  describe('calculateTrialEndDate', () => {
    it('returns a date 14 days after createdAt', () => {
      const created = new Date('2026-01-01T12:00:00Z');
      const end = calculateTrialEndDate(created);
      expect(end.getDate()).toBe(15);
      expect(end.getMonth()).toBe(0);
      expect(end.getFullYear()).toBe(2026);
    });

    it('accepts ISO string', () => {
      const end = calculateTrialEndDate('2026-02-01');
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(1);
      expect(end.getDate()).toBeGreaterThanOrEqual(14);
      expect(end.getDate()).toBeLessThanOrEqual(15);
    });
  });
});
