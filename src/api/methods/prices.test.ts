import { callBackendGet } from '../common/backend';
import { getTokenBySlug } from '../common/tokens';
import { fetchPriceHistory } from './prices';

jest.mock('../common/backend', () => ({ callBackendGet: jest.fn() }));
jest.mock('../common/tokens', () => ({
  tokensPreload: { promise: Promise.resolve() },
  getTokenBySlug: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(callBackendGet).mockReset().mockResolvedValue([]);
  jest.mocked(getTokenBySlug).mockReset();
});

it.each([
  ['ton:ION', { chain: 'ton', symbol: 'ION' }],
  ['bnb:BNB', { chain: 'bnb', symbol: 'BNB' }],
  ['bnb:0x1234', { chain: 'bnb', symbol: 'ION', tokenAddress: '0x1234' }],
  ['ton:EQlion', { chain: 'ton', symbol: 'LION', tokenAddress: 'EQlion' }],
])('requests the encoded asset identity %s with the selected period and currency', async (assetId, identity) => {
  jest.mocked(getTokenBySlug).mockReturnValue(identity as ReturnType<typeof getTokenBySlug>);
  await fetchPriceHistory('test', '1Y', 'EUR');
  expect(callBackendGet).toHaveBeenCalledWith(`/prices/chart/${encodeURIComponent(assetId)}`, {
    base: 'EUR', period: '1Y',
  });
});
