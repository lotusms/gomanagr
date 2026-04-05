import { formatCurrency } from '@/utils/formatCurrency';
import { chartTooltipProps } from './chartTooltipStyles';

/**
 * Merges shared chart tooltip styles with currency formatting using the account default currency
 * (same pattern as invoices / settings — see `formatCurrency` in `@/utils/formatCurrency`).
 *
 * @param {string} [currency='USD'] - ISO currency code from `userAccount.clientSettings.defaultCurrency`
 * @param {{ mode?: 'all' | 'keys', keys?: string[] }} [options]
 *   - `all` (default): every numeric tooltip value is formatted as money (pie, treemap size, stacked amounts).
 *   - `keys`: only values whose series `dataKey` is listed (e.g. scatter `y`/`z` while `x` stays days).
 */
export function mergeChartTooltipCurrency(currency = 'USD', options = {}) {
  const { mode = 'all', keys } = options;
  const code = (currency || 'USD').toUpperCase();

  return {
    ...chartTooltipProps,
    formatter: (value, name, item) => {
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      if (Number.isNaN(n)) return [value, name];
      if (mode === 'keys' && Array.isArray(keys) && keys.length > 0) {
        const k = item?.dataKey;
        if (!keys.includes(k)) return [value, name];
      }
      return [formatCurrency(n, code), name];
    },
  };
}
