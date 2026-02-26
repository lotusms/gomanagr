import { capitalizeName } from '@/utils/capitalizeName';

describe('capitalizeName', () => {
  it('capitalizes first letter of each word', () => {
    expect(capitalizeName('john')).toBe('John');
    expect(capitalizeName('mary jane')).toBe('Mary Jane');
    expect(capitalizeName('JOHN DOE')).toBe('John Doe');
  });

  it('trims and collapses multiple spaces', () => {
    expect(capitalizeName('  john   doe  ')).toBe('John Doe');
  });

  it('returns empty string for null, undefined, or empty', () => {
    expect(capitalizeName('')).toBe('');
    expect(capitalizeName(null)).toBe('');
    expect(capitalizeName(undefined)).toBe('');
  });

  it('handles single character', () => {
    expect(capitalizeName('j')).toBe('J');
  });
});
