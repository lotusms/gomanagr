/**
 * Unit tests for utils/states.js: STATES_BY_COUNTRY, getStatesByCountry, getStateName
 */
import { STATES_BY_COUNTRY, getStatesByCountry, getStateName } from '@/utils/states';

describe('states', () => {
  describe('STATES_BY_COUNTRY', () => {
    it('includes US, CA, MX, AU, GB, BR, IN', () => {
      expect(STATES_BY_COUNTRY.US).toBeDefined();
      expect(STATES_BY_COUNTRY.CA).toBeDefined();
      expect(STATES_BY_COUNTRY.MX).toBeDefined();
      expect(STATES_BY_COUNTRY.AU).toBeDefined();
      expect(STATES_BY_COUNTRY.GB).toBeDefined();
      expect(STATES_BY_COUNTRY.BR).toBeDefined();
      expect(STATES_BY_COUNTRY.IN).toBeDefined();
      expect(Array.isArray(STATES_BY_COUNTRY.US)).toBe(true);
    });
  });

  describe('getStatesByCountry', () => {
    it('returns [] when countryCode is falsy', () => {
      expect(getStatesByCountry('')).toEqual([]);
      expect(getStatesByCountry(null)).toEqual([]);
    });

    it('returns states array for known country', () => {
      const us = getStatesByCountry('US');
      expect(Array.isArray(us)).toBe(true);
      expect(us.length).toBeGreaterThan(0);
      expect(us[0]).toHaveProperty('value');
      expect(us[0]).toHaveProperty('label');
    });

    it('returns [] for unknown country code', () => {
      expect(getStatesByCountry('XX')).toEqual([]);
    });
  });

  describe('getStateName', () => {
    it('returns empty string or stateCode when stateCode or countryCode missing', () => {
      expect(getStateName('', 'US')).toBe('');
      expect(getStateName('CA', '')).toBe('CA');
      expect(getStateName(null, 'US')).toBe('');
    });

    it('returns label when state found', () => {
      expect(getStateName('CA', 'US')).toBe('California');
      expect(getStateName('AL', 'US')).toBe('Alabama');
    });

    it('returns stateCode when not found in country', () => {
      expect(getStateName('XX', 'US')).toBe('XX');
    });
  });
});
