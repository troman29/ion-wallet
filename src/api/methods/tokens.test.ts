import { IONCOIN, STAKED_ION_SLUG } from '../../config';
import { callBackendPost } from '../common/backend';
import { getTokenBySlug } from '../common/tokens';
import { fetchTokenInfo } from './tokens';

jest.mock('../chains', () => ({}));
jest.mock('../common/backend', () => ({ callBackendPost: jest.fn() }));
jest.mock('../common/tokens', () => ({
  tokensPreload: { promise: Promise.resolve() },
  getTokenBySlug: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(callBackendPost).mockReset().mockResolvedValue([]);
  jest.mocked(getTokenBySlug).mockReset();
});

it('qualifies identities with their chains and deduplicates legacy aliases', async () => {
  jest.mocked(getTokenBySlug).mockReturnValue({ ...IONCOIN, priceUsd: 1, percentChange24h: 0 });
  jest.mocked(callBackendPost).mockResolvedValue([
    { slug: 'toncoin', tokenInfo: { description: 'ION' } },
    { slug: 'bnb', tokenInfo: { description: 'Must not overwrite another token' } },
  ]);
  const result = await fetchTokenInfo(['toncoin', IONCOIN.slug], 'ru');
  expect(callBackendPost).toHaveBeenCalledWith('/assets?langCode=ru', { assets: ['ton:ION'] }, { timeout: 10000 });
  expect(result).toEqual({ detailsBySlug: { ioncoin: expect.objectContaining({ description: 'ION' }) } });
});

it('preserves the full LION contract identity', async () => {
  const tokenAddress = STAKED_ION_SLUG.slice(4);
  jest.mocked(getTokenBySlug).mockReturnValue({
    ...IONCOIN, priceUsd: 1, percentChange24h: 0, slug: STAKED_ION_SLUG, tokenAddress, symbol: 'LION',
  });
  await fetchTokenInfo([STAKED_ION_SLUG], 'en');
  expect(callBackendPost).toHaveBeenCalledWith('/assets?langCode=en', {
    assets: [`ton:${tokenAddress}`],
  }, { timeout: 10000 });
});

it('finishes unknown tokens without making a request', async () => {
  expect(await fetchTokenInfo(['unknown'], 'en')).toEqual({ detailsBySlug: {} });
  expect(callBackendPost).not.toHaveBeenCalled();
});

it('distinguishes a provider failure from a successful empty response', async () => {
  jest.mocked(getTokenBySlug).mockReturnValue({ ...IONCOIN, priceUsd: 1, percentChange24h: 0 });
  jest.mocked(callBackendPost).mockRejectedValue(new Error('Offline'));
  expect(await fetchTokenInfo([IONCOIN.slug], 'en')).toBeUndefined();
});
