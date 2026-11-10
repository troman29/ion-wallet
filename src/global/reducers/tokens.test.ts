import { INITIAL_STATE } from '../initialState';
import { clearTokenPriceHistory } from './tokens';

it('clears every token and period on a currency change without changing other state', () => {
  const global = {
    ...INITIAL_STATE,
    tokenPriceHistory: { bySlug: { ioncoin: { '1D': [[1, 2] as [number, number]] }, bnb: { '1Y': [] } } },
  };
  const cleared = clearTokenPriceHistory(global);
  expect(cleared.tokenPriceHistory.bySlug).toEqual({});
  expect(cleared.settings).toBe(global.settings);
  expect(global.tokenPriceHistory.bySlug.ioncoin['1D']).toHaveLength(1);
});
