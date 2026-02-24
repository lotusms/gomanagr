const { formatCurrency, unformatCurrency, formatCurrencyInput } = require('@/utils/formatCurrency');

describe('formatCurrency', () => {
  it('returns empty string for null, undefined, or empty input', () => {
    expect(formatCurrency(null, 'USD')).toBe('');
    expect(formatCurrency(undefined, 'USD')).toBe('');
    expect(formatCurrency('', 'USD')).toBe('');
  });

  it('formats USD with symbol by default', () => {
    expect(formatCurrency(1234.56, 'USD')).toMatch(/\$1,?234\.56/);
  });

  it('accepts string numeric value', () => {
    expect(formatCurrency('99.99', 'USD')).toMatch(/\$99\.99/);
  });

  it('returns empty string for NaN', () => {
    expect(formatCurrency('not-a-number', 'USD')).toBe('');
  });

  it('respects showSymbol: false', () => {
    const result = formatCurrency(1234.56, 'USD', { showSymbol: false });
    expect(result).toBe('1,234.56');
  });
});

describe('unformatCurrency', () => {
  it('returns empty string for empty input', () => {
    expect(unformatCurrency('')).toBe('');
  });

  it('strips currency symbols and commas', () => {
    expect(unformatCurrency('$1,234.56')).toBe('1234.56');
  });
});

describe('formatCurrencyInput', () => {
  it('returns empty string for empty input', () => {
    expect(formatCurrencyInput('')).toBe('');
  });

  it('formats numeric input with commas', () => {
    expect(formatCurrencyInput('1234.56')).toBe('1,234.56');
  });
});
