import type { ApiPriceHistoryPeriod } from '../api/types';

// Ordered longest to shortest, the way the selector lays them out
export const TIME_RANGES: readonly ApiPriceHistoryPeriod[] = ['1Y', '3M', '1M', '7D', '1D'];

export function normalizePriceHistoryPeriod(period?: string): ApiPriceHistoryPeriod {
  // Accounts restored from earlier versions may still have the all-time period selected.
  if (period === 'ALL') return '1Y';

  return TIME_RANGES.find((range) => range === period) ?? '1D';
}
