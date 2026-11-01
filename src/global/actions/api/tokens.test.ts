import './tokens';

import type { ApiHistoryList } from '../../../api/types';
import type { GlobalState } from '../../types';

import { cloneDeep } from '../../../util/iteratees';
import { callApi } from '../../../api';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { INITIAL_STATE } from '../../initialState';

jest.mock('../../../api', () => ({ callApi: jest.fn() }));
jest.mock('../../index', () => ({
  addActionHandler: jest.fn(),
  getGlobal: jest.fn(),
  setGlobal: jest.fn(),
}));

const HISTORY: ApiHistoryList = [[1000, 1.25], [2000, 1.5]];
const SLUG = 'toncoin';
const PAYLOAD = { slug: SLUG, period: '1D', currency: 'USD' };

type LoadPriceHistory = (global: GlobalState, actions: AnyLiteral, payload: typeof PAYLOAD) => Promise<void>;

const loadPriceHistory = (addActionHandler as jest.Mock).mock.calls
  .find(([name]) => name === 'loadPriceHistory')![1] as LoadPriceHistory;

let store: GlobalState;

beforeEach(() => {
  store = cloneDeep(INITIAL_STATE);
  (callApi as jest.Mock).mockReset();
  (getGlobal as jest.Mock).mockImplementation(() => store);
  (setGlobal as jest.Mock).mockClear().mockImplementation((global: GlobalState) => {
    store = global;
  });
});

it('finishes the initial loading state when the price endpoint is unavailable', async () => {
  (callApi as jest.Mock).mockResolvedValue(undefined);
  await loadPriceHistory(store, {}, PAYLOAD);

  expect(store.tokenPriceHistory.bySlug[SLUG]?.['1D']).toEqual([]);
});

it('replaces the unavailable state when a later request succeeds', async () => {
  (callApi as jest.Mock).mockResolvedValueOnce(undefined).mockResolvedValueOnce(HISTORY);
  await loadPriceHistory(store, {}, PAYLOAD);
  await loadPriceHistory(store, {}, PAYLOAD);

  expect(callApi).toHaveBeenLastCalledWith('fetchPriceHistory', SLUG, '1D', 'USD');
  expect(store.tokenPriceHistory.bySlug[SLUG]?.['1D']).toEqual(HISTORY);
});

it('keeps the last successful chart when a refresh fails', async () => {
  store.tokenPriceHistory.bySlug[SLUG] = { '1D': HISTORY };
  (callApi as jest.Mock).mockResolvedValue(undefined);
  await loadPriceHistory(store, {}, PAYLOAD);

  expect(store.tokenPriceHistory.bySlug[SLUG]?.['1D']).toEqual(HISTORY);
});

it('accepts an empty history returned by the server', async () => {
  store.tokenPriceHistory.bySlug[SLUG] = { '1D': HISTORY };
  (callApi as jest.Mock).mockResolvedValue([]);
  await loadPriceHistory(store, {}, PAYLOAD);

  expect(store.tokenPriceHistory.bySlug[SLUG]?.['1D']).toEqual([]);
});

it('discards a response when the base currency changes during the request', async () => {
  (callApi as jest.Mock).mockImplementation(() => {
    store = { ...store, settings: { ...store.settings, baseCurrency: 'EUR' } };
    return Promise.resolve(HISTORY);
  });
  await loadPriceHistory(store, {}, PAYLOAD);

  expect(setGlobal).not.toHaveBeenCalled();
  expect(store.tokenPriceHistory.bySlug[SLUG]).toBeUndefined();
});
