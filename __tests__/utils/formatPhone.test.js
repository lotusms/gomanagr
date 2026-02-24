const { formatPhone, unformatPhone } = require('@/utils/formatPhone');

describe('formatPhone', () => {
  it('returns empty string for empty or falsy input', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
  });

  it('formats 10 digits as (xxx) xxx-xxxx', () => {
    expect(formatPhone('7171234567')).toBe('(717) 123-4567');
  });

  it('formats progressively as user types', () => {
    expect(formatPhone('717')).toBe('(717');
    expect(formatPhone('7171')).toBe('(717) 1');
    expect(formatPhone('71712')).toBe('(717) 12');
    expect(formatPhone('717123')).toBe('(717) 123');
    expect(formatPhone('7171234')).toBe('(717) 123-4');
    expect(formatPhone('71712345')).toBe('(717) 123-45');
    expect(formatPhone('717123456')).toBe('(717) 123-456');
  });

  it('strips non-digit characters before formatting', () => {
    expect(formatPhone('717-123-4567')).toBe('(717) 123-4567');
    expect(formatPhone('(717) 123-4567')).toBe('(717) 123-4567');
  });

  it('truncates to 10 digits', () => {
    expect(formatPhone('71712345678901')).toBe('(717) 123-4567');
  });
});

describe('unformatPhone', () => {
  it('returns empty string for empty or falsy input', () => {
    expect(unformatPhone('')).toBe('');
    expect(unformatPhone(null)).toBe('');
  });

  it('strips all non-digit characters', () => {
    expect(unformatPhone('(717) 123-4567')).toBe('7171234567');
    expect(unformatPhone('717-123-4567')).toBe('7171234567');
  });
});
