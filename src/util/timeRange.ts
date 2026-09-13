import type { ApiPriceHistoryPeriod } from '../api/types';

// Ordered longest to shortest, the way the selector lays them out
export const TIME_RANGES: readonly ApiPriceHistoryPeriod[] = ['ALL', '1Y', '3M', '1M', '7D', '1D'];
