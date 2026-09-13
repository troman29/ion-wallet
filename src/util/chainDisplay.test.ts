import type { ApiChain, ApiStakingState } from '../api/types';
import type { ChainDisplayConfiguration, UserToken } from '../global/types';

import {
  DEFAULT_CHAIN_DISPLAY_CONFIGURATION,
  getAddressLineChains,
  getChainsWithBalance,
  getDefaultVisibleChains,
  getHasOnlyTonTokens,
  getNormalizedManualOrder,
  getOrderedChainsForDisplay,
  getVisibleChains,
  setChainDisplayMode,
  setChainVisibility,
  setManualChainOrder,
} from './chainDisplay';

// The ordering and visibility helpers are plain list operations: they never look a chain up in
// `CHAIN_CONFIG`, so the cases below can use more chains than the app currently supports. Without
// that, an app of two chains leaves no room to tell "kept the order" from "sorted by something".
const foreignChain = (name: string) => name as ApiChain;

const ALPHA = foreignChain('alpha');
const BETA = foreignChain('beta');
const GAMMA = foreignChain('gamma');

function buildToken(slug: string, chain: ApiChain, amount: bigint, isDisabled?: boolean) {
  return { slug, chain, amount, isDisabled } as UserToken;
}

function buildStakingState(tokenSlug: string, balance: bigint) {
  return { type: 'liquid', tokenSlug, balance } as ApiStakingState;
}

describe('getChainsWithBalance', () => {
  it('collects the chains of non-empty tokens', () => {
    const tokens = [
      buildToken('ton', 'ton', 10n),
      buildToken('bnb', 'bnb', 0n),
      buildToken('usdt', 'ton', 5n),
    ];

    expect([...getChainsWithBalance(tokens)]).toEqual(['ton']);
  });

  it('counts staked balances of otherwise empty tokens', () => {
    const tokens = [buildToken('ton', 'ton', 0n), buildToken('bnb', 'bnb', 0n)];
    const stakingStates = [buildStakingState('ton', 100n)];

    expect([...getChainsWithBalance(tokens, stakingStates)]).toEqual(['ton']);
  });
});

describe('getDefaultVisibleChains', () => {
  it('shows every chain of an empty wallet', () => {
    const chains: ApiChain[] = ['ton', 'bnb'];

    expect([...getDefaultVisibleChains(chains, new Set())]).toEqual(chains);
  });

  it('shows only the funded chains of a non-empty wallet', () => {
    const chains: ApiChain[] = ['ton', 'bnb'];

    expect([...getDefaultVisibleChains(chains, new Set(['bnb', ALPHA]))]).toEqual(['bnb']);
  });

  it('shows only the first chain when the funds are outside the account chains', () => {
    expect([...getDefaultVisibleChains(['ton', 'bnb'], new Set([ALPHA]))]).toEqual(['ton']);
  });
});

describe('getAddressLineChains', () => {
  const chains: ApiChain[] = ['ton', 'bnb'];

  it('collapses a Gram Wallet line to TON while the shown tokens are TON-only', () => {
    expect(getAddressLineChains(chains, true, true)).toEqual(['ton']);
  });

  it('keeps every chain once a foreign-chain token is shown', () => {
    expect(getAddressLineChains(chains, false, true)).toBe(chains);
  });

  it('keeps every chain while the token list is not known yet', () => {
    expect(getAddressLineChains(chains, undefined, true)).toBe(chains);
  });

  it('keeps an account without a TON wallet intact', () => {
    const noTonChains: ApiChain[] = ['bnb'];

    expect(getAddressLineChains(noTonChains, true, true)).toBe(noTonChains);
  });

  it('never collapses outside the Gram Wallet build', () => {
    expect(getAddressLineChains(chains, true, false)).toBe(chains);
  });
});

describe('getHasOnlyTonTokens', () => {
  it('is true while every shown token is on TON', () => {
    expect(getHasOnlyTonTokens([buildToken('ton', 'ton', 10n)])).toBe(true);
  });

  it('is true for an empty token list', () => {
    expect(getHasOnlyTonTokens([])).toBe(true);
  });

  it('ignores disabled foreign tokens', () => {
    expect(getHasOnlyTonTokens([buildToken('ton', 'ton', 10n), buildToken('bnb', 'bnb', 0n, true)])).toBe(true);
  });

  it('is false once a foreign-chain token is shown', () => {
    expect(getHasOnlyTonTokens([buildToken('bnb', 'bnb', 5n)])).toBe(false);
  });

  it('is undefined while the token list is not known yet', () => {
    expect(getHasOnlyTonTokens(undefined)).toBeUndefined();
  });
});

describe('chain display order', () => {
  it('uses the automatic visibility and the value order without a configuration', () => {
    const visibleChains = getVisibleChains(
      DEFAULT_CHAIN_DISPLAY_CONFIGURATION,
      ['ton', 'bnb', ALPHA],
      [ALPHA, 'ton', 'bnb'],
      new Set(['ton', ALPHA]),
    );

    expect(visibleChains).toEqual([ALPHA, 'ton']);
  });

  it('keeps the visible zero value chains ahead of the hidden ones', () => {
    const defaultOrder: ApiChain[] = ['ton', 'bnb', ALPHA, BETA, GAMMA];
    const valueOrder: ApiChain[] = ['bnb', 'ton', ALPHA, BETA, GAMMA];
    const defaultVisibleChains = new Set<ApiChain>(['ton', 'bnb', BETA]);

    expect(getOrderedChainsForDisplay(
      DEFAULT_CHAIN_DISPLAY_CONFIGURATION,
      defaultOrder,
      valueOrder,
      defaultVisibleChains,
    )).toEqual(['bnb', 'ton', BETA, ALPHA, GAMMA]);

    expect(getVisibleChains(
      DEFAULT_CHAIN_DISPLAY_CONFIGURATION,
      defaultOrder,
      valueOrder,
      defaultVisibleChains,
    )).toEqual(['bnb', 'ton', BETA]);
  });

  it('ignores the preserved manual choices in the automatic mode', () => {
    const config: ChainDisplayConfiguration = {
      displayMode: 'value',
      hiddenChains: ['ton'],
      shownChains: ['bnb'],
      manualOrder: ['bnb', 'ton', ALPHA],
    };

    expect(getVisibleChains(
      config,
      ['ton', 'bnb', ALPHA],
      [ALPHA, 'ton', 'bnb'],
      new Set(['ton', ALPHA]),
    )).toEqual([ALPHA, 'ton']);
  });

  it('appends the chains missing from a partial manual order in the default order', () => {
    const config: ChainDisplayConfiguration = { displayMode: 'manual', manualOrder: [ALPHA, 'ton'] };

    expect(getOrderedChainsForDisplay(
      config,
      ['ton', 'bnb', ALPHA, BETA],
      [BETA, 'bnb', 'ton', ALPHA],
      new Set(['ton', 'bnb', ALPHA, BETA]),
    )).toEqual([ALPHA, 'ton', 'bnb', BETA]);
  });

  it('keeps the manual order for the visible chains and the value order for the hidden ones', () => {
    const config: ChainDisplayConfiguration = {
      displayMode: 'manual',
      hiddenChains: [ALPHA],
      shownChains: [BETA],
      manualOrder: [ALPHA, 'bnb', GAMMA, 'ton', BETA],
    };
    const defaultOrder: ApiChain[] = ['ton', 'bnb', ALPHA, BETA, GAMMA, foreignChain('delta')];

    expect(getNormalizedManualOrder(config, defaultOrder, new Set(['ton', 'bnb'])))
      .toEqual(['bnb', 'ton', BETA]);

    expect(getOrderedChainsForDisplay(config, defaultOrder, [GAMMA, BETA], new Set(['ton', 'bnb'])))
      .toEqual(['bnb', 'ton', BETA, GAMMA, ALPHA, foreignChain('delta')]);
  });

  it('shows a newly funded chain in the manual mode', () => {
    const config: ChainDisplayConfiguration = {
      displayMode: 'manual',
      hiddenChains: ['bnb'],
      manualOrder: [ALPHA, 'ton', 'bnb'],
    };

    expect(getVisibleChains(
      config,
      ['ton', 'bnb', ALPHA, BETA],
      [BETA, 'ton', 'bnb', ALPHA],
      new Set(['ton', BETA]),
    )).toEqual(['ton', BETA]);
  });
});

describe('chain display configuration updates', () => {
  it('stores only the differences from the automatic visibility', () => {
    let config = setChainDisplayMode(DEFAULT_CHAIN_DISPLAY_CONFIGURATION, 'manual', [ALPHA, 'ton', 'bnb']);
    config = setChainVisibility(config, 'ton', false, true);
    config = setChainVisibility(config, 'bnb', true, false);

    expect(config.hiddenChains).toEqual(['ton']);
    expect(config.shownChains).toEqual(['bnb']);
    expect(config.manualOrder).toEqual([ALPHA, 'bnb']);
    expect(getVisibleChains(
      config,
      ['ton', 'bnb', ALPHA],
      ['ton', ALPHA, 'bnb'],
      new Set(['ton', ALPHA]),
    )).toEqual([ALPHA, 'bnb']);

    config = setChainVisibility(config, 'ton', true, true);
    config = setChainVisibility(config, 'bnb', false, false);

    expect(config.hiddenChains).toBeUndefined();
    expect(config.shownChains).toBeUndefined();
  });

  it('removes a disabled chain from the manual order', () => {
    const config: ChainDisplayConfiguration = {
      displayMode: 'manual',
      manualOrder: ['bnb', 'ton', ALPHA],
    };

    expect(setChainVisibility(config, 'ton', false, true).manualOrder).toEqual(['bnb', ALPHA]);
  });

  it('persists the relative order of the visible chains only', () => {
    const config: ChainDisplayConfiguration = {
      displayMode: 'manual',
      hiddenChains: ['ton'],
      shownChains: [BETA],
    };
    const defaultVisibleChains = new Set<ApiChain>([ALPHA, 'ton']);

    const newConfig = setManualChainOrder(
      config,
      [ALPHA, 'ton', BETA, 'bnb'],
      defaultVisibleChains,
    );

    expect(newConfig.manualOrder).toEqual([ALPHA, BETA]);
    expect(getOrderedChainsForDisplay(
      newConfig,
      ['ton', 'bnb', ALPHA, BETA],
      ['bnb', 'ton', BETA, ALPHA],
      defaultVisibleChains,
    )).toEqual([ALPHA, BETA, 'bnb', 'ton']);
  });

  it('preserves a prior manual order when the mode is switched back and forth', () => {
    const config: ChainDisplayConfiguration = {
      displayMode: 'manual',
      manualOrder: [ALPHA, 'ton', 'bnb'],
    };

    const newConfig = setChainDisplayMode(setChainDisplayMode(config, 'value'), 'manual');

    expect(newConfig.manualOrder).toEqual([ALPHA, 'ton', 'bnb']);
  });
});
