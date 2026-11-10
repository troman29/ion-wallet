import type { UserToken } from '../global/types';

import { PRIORITY_TOKENS, STAKED_ION_SLUG, STAKED_TOKEN_SLUGS } from '../config';
import { getChainBySlug, getIsNativeToken, getIsServiceToken, sortTokens } from './tokens';

function makeToken(overrides: Partial<UserToken> & Pick<UserToken, 'slug' | 'symbol'>): UserToken {
  return {
    amount: 0n,
    name: overrides.symbol,
    price: 0,
    priceUsd: 0,
    decimals: 9,
    change24h: 0,
    chain: 'ton',
    totalValue: '0',
    ...overrides,
  };
}

it('recognizes LION for the existing service-token transfer warning without a code hash', () => {
  expect(STAKED_TOKEN_SLUGS.has(STAKED_ION_SLUG)).toBe(true);
  expect(getIsServiceToken(makeToken({ slug: STAKED_ION_SLUG, symbol: 'LION' }))).toBe(true);
});

it('routes the ION slug namespace to the internal ton chain', () => {
  expect(getIsNativeToken('ioncoin')).toBe(true);
  expect(getChainBySlug('ioncoin')).toBe('ton');
  expect(getChainBySlug(STAKED_ION_SLUG)).toBe('ton');
  expect(getChainBySlug('ion-EQanother-token')).toBe('ton');
  expect(getChainBySlug('toncoin')).toBe('ton');
  expect(getChainBySlug('ton-EQanother-token')).toBe('ton');
  expect(getChainBySlug('bnb-0x123')).toBe('bnb');
});

describe('sortTokens', () => {
  describe('empty wallet (no balances)', () => {
    it('orders priority tokens by PRIORITY_TOKENS sequence, non-priority after', () => {
      const prioritySlugs = PRIORITY_TOKENS.map((t) => t.slug);
      const tokens = [
        makeToken({ slug: 'random', symbol: 'RND' }),
        ...PRIORITY_TOKENS
          .slice()
          .reverse()
          .map(({ slug, symbol }) => makeToken({ slug, symbol })),
      ];

      const sorted = sortTokens(tokens, []).map((t) => t.slug);

      expect(sorted).toEqual([...prioritySlugs, 'random']);
    });

    it('sorts non-priority tokens alphabetically by symbol when all values are zero', () => {
      const tokens = [
        makeToken({ slug: 'zeta', symbol: 'ZETA' }),
        makeToken({ slug: 'alpha', symbol: 'ALPHA' }),
        makeToken({ slug: 'mike', symbol: 'MIKE' }),
      ];

      const sorted = sortTokens(tokens, []).map((t) => t.slug);

      expect(sorted).toEqual(['alpha', 'mike', 'zeta']);
    });
  });

  describe('wallet with balances', () => {
    it('sorts strictly by totalValue desc and ignores priority status', () => {
      const tokens = [
        makeToken({ slug: 'trx', symbol: 'TRX', amount: 100n, totalValue: '51.72' }),
        makeToken({ slug: 'sol', symbol: 'SOL', amount: 1n, totalValue: '23.77' }),
        makeToken({ slug: 'ioncoin', symbol: 'TON', amount: 5n, totalValue: '8.56' }),
        makeToken({ slug: 'usdt-trc20', symbol: 'USDT', amount: 11n, totalValue: '11.38' }),
        makeToken({ slug: 'grm', symbol: 'GRM', amount: 2000n, totalValue: '2.42' }),
        makeToken({ slug: 'vip', symbol: 'VIP', amount: 9000n, totalValue: '2.38' }),
      ];

      const sorted = sortTokens(tokens, []).map((t) => t.slug);

      expect(sorted).toEqual(['trx', 'sol', 'usdt-trc20', 'ioncoin', 'grm', 'vip']);
    });

    it('breaks ties on equal totalValue alphabetically by symbol', () => {
      const tokens = [
        makeToken({ slug: 'b', symbol: 'BETA', amount: 1n, totalValue: '10' }),
        makeToken({ slug: 'a', symbol: 'ALPHA', amount: 1n, totalValue: '10' }),
        makeToken({ slug: 'c', symbol: 'CHARLIE', amount: 1n, totalValue: '20' }),
      ];

      const sorted = sortTokens(tokens, []).map((t) => t.slug);

      expect(sorted).toEqual(['c', 'a', 'b']);
    });

    it('switches to value-based order as soon as a single token has a balance', () => {
      const tokens = [
        makeToken({ slug: 'ioncoin', symbol: 'TON' }),
        makeToken({ slug: 'bnb', symbol: 'BNB' }),
        makeToken({ slug: 'random', symbol: 'RND', amount: 1n, totalValue: '0.01' }),
      ];

      const sorted = sortTokens(tokens, []).map((t) => t.slug);

      expect(sorted).toEqual(['random', 'bnb', 'ioncoin']);
    });
  });

  describe('pinned tokens', () => {
    it('places pinned tokens first in pinnedSlugs order, regardless of value or priority', () => {
      const tokens = [
        makeToken({ slug: 'trx', symbol: 'TRX', amount: 1n, totalValue: '100' }),
        makeToken({ slug: 'grm', symbol: 'GRM', amount: 1n, totalValue: '5' }),
        makeToken({ slug: 'vip', symbol: 'VIP', amount: 1n, totalValue: '3' }),
        makeToken({ slug: 'ioncoin', symbol: 'TON', amount: 1n, totalValue: '50' }),
      ];

      const sorted = sortTokens(tokens, ['vip', 'grm']).map((t) => t.slug);

      expect(sorted).toEqual(['vip', 'grm', 'trx', 'ioncoin']);
    });

    it('keeps pinned-first behavior even on an empty wallet', () => {
      const tokens = [
        makeToken({ slug: 'bnb', symbol: 'BNB' }),
        makeToken({ slug: 'ioncoin', symbol: 'TON' }),
        makeToken({ slug: 'random', symbol: 'RND' }),
      ];

      const sorted = sortTokens(tokens, ['random']).map((t) => t.slug);

      // The unpinned rest keeps the `PRIORITY_TOKENS` order
      expect(sorted).toEqual(['random', 'ioncoin', 'bnb']);
    });
  });

  it('returns a new array and does not mutate the input', () => {
    const tokens = [
      makeToken({ slug: 'b', symbol: 'B', amount: 1n, totalValue: '1' }),
      makeToken({ slug: 'a', symbol: 'A', amount: 1n, totalValue: '2' }),
    ];
    const snapshot = tokens.map((t) => t.slug);

    const sorted = sortTokens(tokens, []);

    expect(tokens.map((t) => t.slug)).toEqual(snapshot);
    expect(sorted).not.toBe(tokens);
  });
});
