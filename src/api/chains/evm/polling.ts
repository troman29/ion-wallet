import type {
  ApiAccountWithChain,
  ApiActivity,
  ApiActivityTimestamps,
  ApiBalanceBySlug,
  ApiChain,
  EVMChain,
  OnApiUpdate,
  OnUpdatingStatusChange,
} from '../../types';

import { parseAccountId } from '../../../util/account';
import { getActivityTokenSlugs } from '../../../util/activities';
import { getChainConfig, getSupportedChains } from '../../../util/chain';
import { compact } from '../../../util/iteratees';
import { logDebugError } from '../../../util/logs';
import { pause } from '../../../util/schedulers';
import { getChainBySlug } from '../../../util/tokens';
import { getAlchemySocket } from './util/socket';
import { fetchStoredWallet } from '../../common/accounts';
import {
  activeWalletTiming,
  inactiveWalletTiming,
} from '../../common/polling/utils';
import { sendUpdateTokens } from '../../common/tokens';
import { txCallbacks } from '../../common/txCallbacks';
import { BalanceStream } from '../../common/websocket/balanceStream';
import { FIRST_TRANSACTIONS_LIMIT, MINUTE, SEC } from '../../constants';
import { getTokenActivitySlice } from './activities';
import { fetchAccountAssets, fetchCrosschainAccountAssets } from './wallet';

// Every poll reaches our backend, so it is less frequent than the shared timing
const activeEvmWalletTiming = {
  ...activeWalletTiming,
  pollingPeriod: { focused: 10 * SEC, notFocused: 30 * SEC },
  forcedPollingPeriod: { focused: 3 * MINUTE, notFocused: 10 * MINUTE },
};

const inactiveEvmWalletTiming = {
  ...inactiveWalletTiming,
  forcedPollingPeriod: { focused: 10 * MINUTE, notFocused: 10 * MINUTE },
};

export function setupActivePolling<C extends EVMChain>(
  chain: C,
  accountId: string,
  account: ApiAccountWithChain<C>,
  onUpdate: OnApiUpdate,
  onUpdatingStatusChange: OnUpdatingStatusChange,
  newestActivityTimestamps: ApiActivityTimestamps,
): NoneToVoidFunction {
  const { address } = account.byChain[chain];
  let markWalletActiveForBalancePolling: NoneToVoidFunction = () => {};

  const {
    scheduleCrossApiActivityCatchUp,
    cancelCrossApiActivityCatchUp,
  } = setupActivityPolling(
    chain, accountId, newestActivityTimestamps, onUpdate,
    onUpdatingStatusChange.bind(undefined, 'activities'),
    () => markWalletActiveForBalancePolling(),
  );

  const balancePolling = setupBalancePolling(
    chain,
    accountId,
    address,
    true,
    scheduleCrossApiActivityCatchUp,
    cancelCrossApiActivityCatchUp,
    onUpdate,
    onUpdatingStatusChange.bind(undefined, 'balance'),
  );
  markWalletActiveForBalancePolling = balancePolling.markWalletActiveAndForcePoll;

  return () => {
    balancePolling.stop();
  };
}

const BALANCE_ACTIVITY_CATCH_UP_ATTEMPTS = 60;
const BACKFILL_RELOAD_DELAY = 15 * SEC;

function setupActivityPolling(
  chain: EVMChain,
  accountId: string,
  newestActivityTimestamps: ApiActivityTimestamps,
  onUpdate: OnApiUpdate,
  onUpdatingStatusChange: (isUpdating: boolean) => void,
  onActivityDetected: NoneToVoidFunction,
): {
    scheduleCrossApiActivityCatchUp: (source: 'socket' | 'poll') => void;
    cancelCrossApiActivityCatchUp: NoneToVoidFunction;
  } {
  const initialTimestamps = compact(Object.values(newestActivityTimestamps));
  let newestConfirmedActivityTimestamp = initialTimestamps.length ? Math.max(...initialTimestamps) : undefined;

  let lastEmptyTimestamp: number | undefined;
  let balanceCatchUpGeneration = 0;

  async function rawUpdate(): Promise<boolean> {
    if (newestConfirmedActivityTimestamp !== undefined && newestConfirmedActivityTimestamp === lastEmptyTimestamp) {
      return false;
    }

    onUpdatingStatusChange(true);

    try {
      if (newestConfirmedActivityTimestamp === undefined) {
        const { timestamps: result, isBackfilling } = await loadInitialActivities(chain, accountId, onUpdate);
        const timestamps = compact(Object.values(result));

        if (isBackfilling) {
          // Older history is still arriving, so the initial load repeats instead of polling for newer rows only
          scheduleInitialReload();
          return timestamps.length > 0;
        }

        newestConfirmedActivityTimestamp = timestamps.length ? Math.max(...timestamps) : undefined;
        if (timestamps.length) {
          onActivityDetected();
        }

        return timestamps.length > 0;
      } else {
        const result = await loadNewActivities(chain, accountId, newestConfirmedActivityTimestamp, onUpdate);
        const newTimestamps = compact(Object.values(result));

        if (newTimestamps.length && Math.max(...newTimestamps) > newestConfirmedActivityTimestamp) {
          newestConfirmedActivityTimestamp = Math.max(newestConfirmedActivityTimestamp, Math.max(...newTimestamps));
          onActivityDetected();
          return true;
        }

        lastEmptyTimestamp = newestConfirmedActivityTimestamp;

        return false;
      }
    } catch (err) {
      logDebugError(`EVM:${chain} setupActivityPolling`, err);
      return false;
    } finally {
      onUpdatingStatusChange(false);
    }
  }

  function scheduleCrossApiActivityCatchUp(source: 'socket' | 'poll') {
    balanceCatchUpGeneration += 1;
    const generation = balanceCatchUpGeneration;

    void (async () => {
      for (let attempt = 0; attempt < BALANCE_ACTIVITY_CATCH_UP_ATTEMPTS; attempt++) {
        if (generation !== balanceCatchUpGeneration) {
          return;
        }
        lastEmptyTimestamp = undefined;
        const found = await rawUpdate();

        if (source === 'poll') {
          return;
        }

        if (found) {
          return;
        }
        if (newestConfirmedActivityTimestamp === undefined) {
          return;
        }
        if (generation !== balanceCatchUpGeneration) {
          return;
        }

        await pause(SEC * 2);
      }
    })();
  }

  function cancelCrossApiActivityCatchUp() {
    balanceCatchUpGeneration += 1;
  }

  function scheduleInitialReload() {
    const generation = balanceCatchUpGeneration;
    setTimeout(() => {
      if (generation === balanceCatchUpGeneration) {
        scheduleCrossApiActivityCatchUp('poll');
      }
    }, BACKFILL_RELOAD_DELAY);
  }

  if (newestConfirmedActivityTimestamp === undefined) {
    scheduleCrossApiActivityCatchUp('poll');
  }

  return {
    scheduleCrossApiActivityCatchUp,
    cancelCrossApiActivityCatchUp,
  };
}

function setupBalancePolling(
  chain: EVMChain,
  accountId: string,
  address: string,
  isActive: boolean,
  scheduleCrossApiActivityCatchUp: (source: 'socket' | 'poll') => void,
  cancelCrossApiActivityCatchUp: NoneToVoidFunction,
  onUpdate: OnApiUpdate,
  onUpdatingStatusChange?: (isUpdating: boolean) => void,
) {
  const { network } = parseAccountId(accountId);
  const balanceStream = new BalanceStream({
    chain,
    wsClient: getAlchemySocket(network, chain),
    network,
    address,
    sendUpdateTokens: () => sendUpdateTokens(onUpdate),
    fallbackPollingOptions: isActive ? activeEvmWalletTiming : inactiveEvmWalletTiming,
    fetchBalancesCb: (...args) => fetchAccountAssets(chain, ...args),
    fetchCrosschainBalancesCb: fetchCrosschainAccountAssets,
    importUnknownTokens: undefined,
    loadingConcurrencyLimiter: undefined,
  });

  balanceStream.onUpdate((balances, updateSource) => {
    const crosschainAssetsByChain = new Map<ApiChain, ApiBalanceBySlug>();

    const knownChains = getSupportedChains();

    for (const [slug, balance] of Object.entries(balances)) {
      const assetChain = getChainBySlug(slug);

      if (!knownChains.includes(assetChain)) {
        continue;
      }

      crosschainAssetsByChain.set(assetChain, {
        ...crosschainAssetsByChain.get(assetChain),
        [slug]: balance,
      });
    }

    for (const [assetChain, balances] of crosschainAssetsByChain.entries()) {
      onUpdate({
        type: 'updateBalances',
        accountId,
        chain: assetChain,
        balances,
      });
    }

    scheduleCrossApiActivityCatchUp(updateSource);
  });

  if (onUpdatingStatusChange) {
    balanceStream.onLoadingChange(onUpdatingStatusChange);
  }
  balanceStream.start();

  return {
    stop() {
      cancelCrossApiActivityCatchUp();
      balanceStream.destroy();
    },
    markWalletActiveAndForcePoll() {
      balanceStream.markWalletActiveAndForcePoll();
    },
  };
}

export function setupInactivePolling<C extends EVMChain>(
  chain: C,
  accountId: string,
  account: ApiAccountWithChain<C>,
  onUpdate: OnApiUpdate,
): NoneToVoidFunction {
  const { address } = account.byChain[chain];

  const balancePolling = setupBalancePolling(
    chain,
    accountId,
    address,
    false,
    () => {},
    () => {},
    onUpdate,
  );

  return balancePolling.stop;
}

// The gate is a cost optimisation, so a probe that cannot answer does not get to decide. It
// reads from the RPC provider, which is separate from the history provider, and an outage there
// says nothing about whether history exists - blanking the feed on it would trade a saved request
// for a wallet that looks empty while its history is perfectly reachable.
async function loadInitialActivities(
  chain: EVMChain,
  accountId: string,
  onUpdate: OnApiUpdate,
): Promise<{ timestamps: ApiActivityTimestamps; isBackfilling: boolean }> {
  try {
    const { network } = parseAccountId(accountId);
    const { address } = await fetchStoredWallet(accountId, chain);

    const { activities: rawActivities, hasMore: mainHistoryHasMore, isBackfilling } = await getTokenActivitySlice(
      chain,
      network,
      address,
      undefined,
      undefined,
      undefined,
      FIRST_TRANSACTIONS_LIMIT,
    );
    const activities = rawActivities;

    activities
      .slice()
      .reverse()
      .forEach((activity) => {
        txCallbacks.runCallbacks(activity);
      });

    // Record the newest activity of every token slug, not just the native one. A token- or
    // token-led wallet can have no native-coin activity on its first page, so a native-only marker
    // would stay unset and make every launch repeat the full initial fetch instead of an
    // incremental poll. An empty wallet still yields an empty `bySlug`, so the reducer's
    // empty-update guard short-circuits.
    const result: ApiActivityTimestamps = {};
    const bySlug: Record<string, ApiActivity[]> = {};
    for (const activity of activities) {
      for (const slug of getActivityTokenSlugs(activity)) {
        (bySlug[slug] ??= []).push(activity);
        result[slug] ??= activity.timestamp; // `activities` is sorted newest-first
      }
    }

    // `getActivityTokenSlugs` returns no slugs for NFT transfers, so a first page made entirely of
    // NFT activity leaves `result` empty and `newestConfirmedActivityTimestamp` stuck at `undefined`,
    // forcing every subsequent poll to repeat this expensive initial load. Stamp a native-token
    // fallback timestamp (without touching `bySlug`) so that doesn't happen, mirroring the
    // unconditional stamp in `loadNewActivities`.
    if (!Object.keys(result).length && activities.length) {
      result[getChainConfig(chain).nativeToken.slug] = activities[0].timestamp;
    }

    onUpdate({
      type: 'initialActivities',
      chain,
      accountId,
      mainActivities: activities,
      // Keeps the feed loading while the backend still loads older history
      mainHistoryHasMore: mainHistoryHasMore || isBackfilling,
      bySlug,
    });

    return { timestamps: result, isBackfilling };
  } catch (err) {
    // Ensure `areInitialActivitiesLoaded[chain] = true` even on failure so
    // `waitInitialActivityLoading` unblocks and other chains stay visible.
    onUpdate({
      type: 'initialActivities',
      chain,
      accountId,
      mainActivities: [],
      bySlug: {},
    });
    throw err;
  }
}

async function loadNewActivities(
  chain: EVMChain,
  accountId: string,
  newestActivityTimestamp: number,
  onUpdate: OnApiUpdate,
): Promise<ApiActivityTimestamps> {
  const { network } = parseAccountId(accountId);
  const { address } = await fetchStoredWallet(accountId, chain);

  const { activities: rawActivities } = await getTokenActivitySlice(
    chain,
    network,
    address,
    undefined,
    undefined,
    newestActivityTimestamp,
    FIRST_TRANSACTIONS_LIMIT,
  );
  const result: ApiActivityTimestamps = {};
  if (!rawActivities.length) return result;

  // Anchor the next poll on the newest on-chain activity.
  result[getChainConfig(chain).nativeToken.slug] = rawActivities[0].timestamp;

  const activities = rawActivities;

  activities
    .slice()
    .reverse()
    .forEach((activity) => {
      txCallbacks.runCallbacks(activity);
    });

  onUpdate({
    type: 'newActivities',
    chain,
    activities,
    pendingActivities: [],
    accountId,
  });

  return result;
}
