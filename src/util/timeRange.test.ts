import { normalizePriceHistoryPeriod, TIME_RANGES } from './timeRange';

it('restores an old all-time selection as one year without offering ALL', () => {
  expect(normalizePriceHistoryPeriod('ALL')).toBe('1Y');
  expect(TIME_RANGES).toEqual(['1Y', '3M', '1M', '7D', '1D']);
});

it('preserves supported periods and falls back for missing or invalid cache values', () => {
  expect(normalizePriceHistoryPeriod('7D')).toBe('7D');
  expect(normalizePriceHistoryPeriod()).toBe('1D');
  expect(normalizePriceHistoryPeriod('invalid')).toBe('1D');
});
