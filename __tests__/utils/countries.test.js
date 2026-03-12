/**
 * Unit tests for utils/countries.js: COUNTRIES, getCountryName
 */
import { COUNTRIES, getCountryName } from '@/utils/countries';

describe('countries', () => {
  it('COUNTRIES is sorted by label', () => {
    const labels = COUNTRIES.map((c) => c.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it('getCountryName returns label when code exists', () => {
    expect(getCountryName('US')).toBe('United States');
    expect(getCountryName('CA')).toBe('Canada');
    expect(getCountryName('GB')).toBe('United Kingdom');
  });

  it('getCountryName returns code when not found', () => {
    expect(getCountryName('XX')).toBe('XX');
    expect(getCountryName('')).toBe('');
  });
});
