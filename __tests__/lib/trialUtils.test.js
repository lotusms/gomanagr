/**
 * Unit tests for lib/trialUtils.js
 */

import { getTrialStatus, calculateTrialEndDate, getOrgTrialStatus } from '@/lib/trialUtils';

const TRIAL_DAYS = 14;

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

    it('computes trial end as 14 days after createdAt when trialEndsAt is missing (exported user scenario)', () => {
      const createdAt = '2026-02-12T19:53:50.606Z';
      const result = getTrialStatus({ trial: true, createdAt });
      expect(result.trialEndsAt).toBeInstanceOf(Date);
      expect(result.trialEndsAt.toISOString()).toBe('2026-02-26T19:53:50.606Z');
    });

    it('returns expired when trial has createdAt only and now is past trial end (14 days)', () => {
      jest.useFakeTimers();
      const createdAt = '2026-02-12T19:53:50.606Z';
      jest.setSystemTime(new Date('2026-03-01T00:00:00Z'));
      const result = getTrialStatus({ trial: true, createdAt });
      expect(result.expired).toBe(true);
      expect(result.daysRemaining).toBe(0);
      expect(result.trialEndsAt.toISOString()).toBe('2026-02-26T19:53:50.606Z');
      jest.useRealTimers();
    });

    it('returns not expired and daysRemaining when trial has createdAt only and now is before trial end', () => {
      jest.useFakeTimers();
      const createdAt = '2026-02-12T19:53:50.606Z';
      jest.setSystemTime(new Date('2026-02-20T00:00:00Z'));
      const result = getTrialStatus({ trial: true, createdAt });
      expect(result.expired).toBe(false);
      expect(result.daysRemaining).toBe(7);
      expect(result.trialEndsAt.toISOString()).toBe('2026-02-26T19:53:50.606Z');
      jest.useRealTimers();
    });
  });

  describe('calculateTrialEndDate', () => {
    it('returns a date exactly 14 days after createdAt', () => {
      const created = new Date('2026-01-01T12:00:00Z');
      const end = calculateTrialEndDate(created);
      const diffMs = end - created;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(TRIAL_DAYS);
      expect(end.getDate()).toBe(15);
      expect(end.getMonth()).toBe(0);
      expect(end.getFullYear()).toBe(2026);
    });

    it('returns 2026-02-26 for createdAt 2026-02-12 (exported user scenario)', () => {
      const created = new Date('2026-02-12T19:53:50.606Z');
      const end = calculateTrialEndDate(created);
      expect(end.toISOString()).toBe('2026-02-26T19:53:50.606Z');
    });

    it('accepts ISO string', () => {
      const end = calculateTrialEndDate('2026-02-01');
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(1);
      expect(end.getDate()).toBeGreaterThanOrEqual(14);
      expect(end.getDate()).toBeLessThanOrEqual(15);
    });
  });

  describe('getOrgTrialStatus', () => {
    it('returns not expired when organization is null or undefined', () => {
      expect(getOrgTrialStatus(null)).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
      expect(getOrgTrialStatus(undefined)).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
    });

    it('returns not expired when organization.trial is not true', () => {
      expect(getOrgTrialStatus({ trial: false })).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
      expect(getOrgTrialStatus({})).toEqual({ expired: false, daysRemaining: 0, trialEndsAt: null });
    });

    it('returns expired when trial is true and trial_ends_at is in the past', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const result = getOrgTrialStatus({ trial: true, trial_ends_at: past.toISOString() });
      expect(result.expired).toBe(true);
      expect(result.daysRemaining).toBe(0);
      expect(result.trialEndsAt).toBeInstanceOf(Date);
    });

    it('returns not expired when trial is true and trial_ends_at is in the future', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const result = getOrgTrialStatus({ trial: true, trial_ends_at: future.toISOString() });
      expect(result.expired).toBe(false);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(1);
    });

    it('accepts trialEndsAt (camelCase) for organization', () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const result = getOrgTrialStatus({ trial: true, trialEndsAt: future.toISOString() });
      expect(result.expired).toBe(false);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(1);
    });

    it('computes trial end as 14 days after created_at when trial_ends_at is missing', () => {
      const created_at = '2026-02-12T19:53:50.606Z';
      const result = getOrgTrialStatus({ trial: true, created_at });
      expect(result.trialEndsAt).toBeInstanceOf(Date);
      expect(result.trialEndsAt.toISOString()).toBe('2026-02-26T19:53:50.606Z');
    });

    it('returns expired when trial is true and no trial_ends_at or created_at', () => {
      const result = getOrgTrialStatus({ trial: true });
      expect(result).toEqual({ expired: true, daysRemaining: 0, trialEndsAt: null });
    });
  });
});
