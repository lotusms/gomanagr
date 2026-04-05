/**
 * Unit tests for mergeChartTooltipCurrency.
 */

import { mergeChartTooltipCurrency } from '@/components/insights/charts/chartCurrencyTooltip';

describe('mergeChartTooltipCurrency', () => {
  it('formats numeric values with account currency (mode all)', () => {
    const { formatter } = mergeChartTooltipCurrency('USD', { mode: 'all' });
    const [val] = formatter(1234.5, 'Amount', {});
    expect(val).toMatch(/\$1,234\.50/);
  });

  it('respects currency code', () => {
    const { formatter } = mergeChartTooltipCurrency('EUR', { mode: 'all' });
    const [val] = formatter(100, 'x', {});
    expect(val).toMatch(/100/);
    expect(val).toMatch(/€/);
  });

  it('mode keys only formats listed dataKeys', () => {
    const { formatter } = mergeChartTooltipCurrency('USD', { mode: 'keys', keys: ['y'] });
    expect(formatter(500, 'y', { dataKey: 'y' })[0]).toMatch(/\$/);
    const days = formatter(14, 'days', { dataKey: 'x' });
    expect(days[0]).toBe(14);
  });

  it('passes through non-numeric values without throwing', () => {
    const { formatter } = mergeChartTooltipCurrency('USD', { mode: 'all' });
    const [v] = formatter('n/a', 'name', {});
    expect(v).toBe('n/a');
  });
});
