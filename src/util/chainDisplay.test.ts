import type { ApiChain } from '../api/types';
import type { ChainDisplayConfiguration } from '../global/types';

import {
  DEFAULT_CHAIN_DISPLAY_CONFIGURATION,
  getDefaultVisibleChains,
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

describe('getDefaultVisibleChains', () => {
  it('shows every chain the account holds', () => {
    const chains: ApiChain[] = ['ton', 'bnb'];

    expect([...getDefaultVisibleChains(chains)]).toEqual(chains);
  });

  it('shows a single-chain account its own chain alone', () => {
    expect([...getDefaultVisibleChains(['ton'])]).toEqual(['ton']);
  });

  it('drops a stored chain the app no longer supports', () => {
    expect([...getDefaultVisibleChains(['ton', ALPHA, 'bnb'])]).toEqual(['ton', 'bnb']);
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
