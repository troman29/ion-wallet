import type { ApiChain } from '../api/types';
import type { ChainDisplayConfiguration } from '../global/types';

import { getAllSupportedVisibleChains } from './chain';
import { unique } from './iteratees';

export const DEFAULT_CHAIN_DISPLAY_CONFIGURATION: ChainDisplayConfiguration = { displayMode: 'value' };

/**
 * The chains the app shows automatically, until the user changes the list themselves: every chain the
 * account holds.
 *
 * Upstream narrowed this to the funded chains once a wallet held anything, which suited a wallet of a
 * dozen chains. With two it hid half the app, and any airdropped token was enough to do it: a single
 * unsolicited BEP-20 took the ION address off the card.
 */
export function getDefaultVisibleChains(accountChains: ApiChain[]) {
  const supportedChains = getAllSupportedVisibleChains();

  return new Set(unique(accountChains).filter((chain) => supportedChains.has(chain)));
}

export function getIsChainVisible(
  config: ChainDisplayConfiguration,
  chain: ApiChain,
  defaultVisibleChains: ReadonlySet<ApiChain>,
) {
  if (config.hiddenChains?.includes(chain)) return false;
  if (config.shownChains?.includes(chain)) return true;

  return defaultVisibleChains.has(chain);
}

/**
 * Every chain of the account in the order the Blockchains screen lists them:
 * the shown ones first, the hidden ones after.
 *
 * `defaultOrder` is the chains in the regular app order.
 * `valueOrder` is the same chains sorted by balance.
 */
export function getOrderedChainsForDisplay(
  config: ChainDisplayConfiguration,
  defaultOrder: ApiChain[],
  valueOrder: ApiChain[],
  defaultVisibleChains: ReadonlySet<ApiChain>,
) {
  const availableOrder = unique(defaultOrder);
  const completeValueOrder = buildCompleteValueOrder(availableOrder, valueOrder);

  if (config.displayMode === 'value') {
    return [
      ...completeValueOrder.filter((chain) => defaultVisibleChains.has(chain)),
      ...completeValueOrder.filter((chain) => !defaultVisibleChains.has(chain)),
    ];
  }

  const visibleChains = getNormalizedManualOrder(config, availableOrder, defaultVisibleChains);
  const visibleChainSet = new Set(visibleChains);

  return [...visibleChains, ...completeValueOrder.filter((chain) => !visibleChainSet.has(chain))];
}

/**
 * The stored manual order is a plain list of chain names, so over time it can go stale: some chain gets hidden later,
 * and a chain added to the app afterward is missing from the list entirely.
 *
 * So the hidden chains are dropped from it, and the new ones are appended in the order they show up in the app.
 */
export function getNormalizedManualOrder(
  config: ChainDisplayConfiguration,
  defaultOrder: ApiChain[],
  defaultVisibleChains: ReadonlySet<ApiChain>,
) {
  const availableOrder = unique(defaultOrder);
  const availableChains = new Set(availableOrder);
  const orderedManually = unique(config.manualOrder ?? []).filter((chain) => {
    return availableChains.has(chain) && getIsChainVisible(config, chain, defaultVisibleChains);
  });
  const manuallyOrderedChains = new Set(orderedManually);

  return [
    ...orderedManually,
    ...availableOrder.filter((chain) => {
      return !manuallyOrderedChains.has(chain) && getIsChainVisible(config, chain, defaultVisibleChains);
    }),
  ];
}

/**
 * The chains to show everywhere in the app except the Blockchains screen.
 *
 * The list always holds at least one chain. Otherwise, the wallet would have no address to receive funds at.
 */
export function getVisibleChains(
  config: ChainDisplayConfiguration,
  defaultOrder: ApiChain[],
  valueOrder: ApiChain[],
  defaultVisibleChains: ReadonlySet<ApiChain>,
) {
  const orderedChains = getOrderedChainsForDisplay(config, defaultOrder, valueOrder, defaultVisibleChains);
  const isAutomatic = config.displayMode === 'value';
  const visibleChains = orderedChains.filter((chain) => (isAutomatic
    ? defaultVisibleChains.has(chain)
    : getIsChainVisible(config, chain, defaultVisibleChains)));

  if (visibleChains.length) {
    return visibleChains;
  }

  const fallbackChain = isAutomatic
    ? orderedChains[0]
    : defaultOrder.find((chain) => !config.hiddenChains?.includes(chain)) ?? defaultOrder[0];

  return fallbackChain ? [fallbackChain] : [];
}

export function setChainDisplayMode(
  config: ChainDisplayConfiguration,
  displayMode: ChainDisplayConfiguration['displayMode'],
  capturedOrder?: ApiChain[],
) {
  return buildChainDisplayConfiguration({
    ...config,
    displayMode,
    manualOrder: displayMode === 'manual' && capturedOrder ? capturedOrder : config.manualOrder,
  });
}

/**
 * A switch is stored only when the user changes a chain's visibility by hand.
 *
 * Flipping it back to the default state removes the record, and the chain's visibility is decided by its balance again.
 *
 * For example, a chain hidden now because of a zero balance shows up on its own once funds arrive in it later,
 * with no need to visit the settings again.
 */
export function setChainVisibility(
  config: ChainDisplayConfiguration,
  chain: ApiChain,
  isVisible: boolean,
  isAutomaticallyVisible: boolean,
) {
  const hiddenChains = (config.hiddenChains ?? []).filter((c) => c !== chain);
  const shownChains = (config.shownChains ?? []).filter((c) => c !== chain);

  if (isVisible !== isAutomaticallyVisible) {
    (isVisible ? shownChains : hiddenChains).push(chain);
  }

  return buildChainDisplayConfiguration({
    ...config,
    hiddenChains,
    shownChains,
    manualOrder: isVisible ? config.manualOrder : config.manualOrder?.filter((c) => c !== chain),
  });
}

export function setManualChainOrder(
  config: ChainDisplayConfiguration,
  manualOrder: ApiChain[],
  defaultVisibleChains: ReadonlySet<ApiChain>,
) {
  return buildChainDisplayConfiguration({
    ...config,
    manualOrder: manualOrder.filter((chain) => getIsChainVisible(config, chain, defaultVisibleChains)),
  });
}

export function getIsDefaultChainDisplayConfiguration(config: ChainDisplayConfiguration) {
  return config.displayMode === 'value'
    && !config.hiddenChains?.length
    && !config.shownChains?.length
    && !config.manualOrder?.length;
}

function buildChainDisplayConfiguration(config: ChainDisplayConfiguration): ChainDisplayConfiguration {
  const hiddenChains = unique(config.hiddenChains ?? []);
  const hiddenChainSet = new Set(hiddenChains);
  const shownChains = unique(config.shownChains ?? []).filter((chain) => !hiddenChainSet.has(chain));
  const manualOrder = unique(config.manualOrder ?? []);

  return {
    displayMode: config.displayMode,
    ...(hiddenChains.length > 0 && { hiddenChains }),
    ...(shownChains.length > 0 && { shownChains }),
    ...(manualOrder.length > 0 && { manualOrder }),
  };
}

function buildCompleteValueOrder(availableOrder: ApiChain[], valueOrder: ApiChain[]) {
  const availableChains = new Set(availableOrder);
  const orderedByValue = unique(valueOrder).filter((chain) => availableChains.has(chain));
  const valueOrderedChains = new Set(orderedByValue);

  return [...orderedByValue, ...availableOrder.filter((chain) => !valueOrderedChains.has(chain))];
}
