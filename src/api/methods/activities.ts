import type {
  ApiActivity,
  ApiChain,
  ApiFetchActivitySliceOptions,
  ApiFetchTransactionByIdOptions,
  ApiTransactionActivity,
} from '../types';

import { DEBUG } from '../../config';
import { throwIfAborted } from '../../util/abortSignal';
import { parseAccountId } from '../../util/account';
import {
  getActivityChains, getActivityContinuationTimestamp, getIsActivityPending, getIsTxIdLocal,
} from '../../util/activities';
import {
  areActivitiesSortedAndUnique, mergeSortedActivitiesToMaxTime, sortActivities,
} from '../../util/activities/order';
import { getChainConfig, getOrderedAccountChains } from '../../util/chain';
import { unique } from '../../util/iteratees';
import { logDebug, logDebugError } from '../../util/logs';
import { getChainBySlug } from '../../util/tokens';
import chains from '../chains';
import { getTokenActivitySlice as getEvmTokenActivitySlice } from '../chains/evm/activities';
import { fetchStoredAccount } from '../common/accounts';
import { fetchBridgeActivityDetails, fetchBridgeHistory } from '../common/activities/bridge/backend';
import { hydrateBridgeActivityEvidence } from '../common/activities/bridge/hydration';
import {
  getLastPageTraceBoundaryId,
  trimPageBoundaryTraceActivities,
} from '../common/activities/reconciler/pagination';
import { reconcileNewActivitiesUpdate } from '../common/activities/reconciler/pendingReconciler';

export type ActivitySliceResult = {
  activities: ApiActivity[];
  hasMore: boolean;
  continuationTimestamp?: number;
  removedIds?: string[];
};

type RawActivitySliceResult = ActivitySliceResult & {
  incompleteTraceIds: string[];
};

export type ReconcileActivityUpdateResult = Awaited<ReturnType<typeof reconcileActivityUpdate>>;

export async function fetchPastActivities(
  accountId: string,
  limit: number,
  tokenSlug?: string,
  toTimestamp?: number,
  options?: { signal?: AbortSignal; shouldThrowOnError?: boolean },
): Promise<ActivitySliceResult | undefined> {
  const { signal, shouldThrowOnError = false } = options ?? {};
  try {
    const raw = tokenSlug
      ? await fetchTokenActivitySlice(accountId, limit, tokenSlug, toTimestamp, signal)
      : await fetchAllActivitySlice(accountId, limit, toTimestamp, signal);
    const rawContinuationTimestamp = getActivityContinuationTimestamp(raw.activities, (activity) => activity);
    const bridge = await fetchBridgeHistory(accountId, [], {
      toTimestamp, throughTimestamp: rawContinuationTimestamp, tokenSlug, signal,
    });
    const continuationTimestamp = bridge.coverageTimestamp === undefined ? rawContinuationTimestamp
      : Math.max(rawContinuationTimestamp ?? -Infinity, bridge.coverageTimestamp);

    return {
      activities: sortActivities([...raw.activities, ...bridge.activities]),
      hasMore: raw.hasMore || bridge.hasMore,
      continuationTimestamp,
      removedIds: bridge.removedIds,
    };
  } catch (err) {
    throwIfAborted(signal);
    logDebugError('fetchPastActivities', tokenSlug, err);
    if (shouldThrowOnError) throw err;
    return undefined;
  }
}

export async function reconcileActivityUpdate(
  accountId: string,
  previousActivities: readonly ApiActivity[],
  confirmedActivities: readonly ApiActivity[],
  pendingActivities?: readonly ApiActivity[],
) {
  const isTransaction = (activity: ApiActivity): activity is ApiTransactionActivity => activity.kind === 'transaction';
  const previousTransactions = previousActivities.filter(isTransaction)
    .filter((activity) => getIsTxIdLocal(activity.id) || getIsActivityPending(activity))
    .sort((first, second) => Number(getIsTxIdLocal(second.id)) - Number(getIsTxIdLocal(first.id)));
  const reconciliation = reconcileNewActivitiesUpdate(
    previousTransactions, confirmedActivities.filter(isTransaction),
    pendingActivities?.filter(isTransaction),
  );
  const bridge = await fetchBridgeHistory(accountId, previousActivities);
  const rowsById = new Map([...previousActivities, ...reconciliation.patch.upsert]
    .map((activity) => [activity.id, activity]));
  const evidenceActivities = await hydrateBridgeActivityEvidence(
    accountId, [...rowsById.values()], bridge.activities, (activity) => fetchActivityDetails(accountId, activity),
  );

  return {
    bridgeHasMore: bridge.hasMore,
    evidenceActivities,
    confirmedActivities: [...reconciliation.confirmedActivities, ...bridge.activities] as ApiActivity[],
    pendingActivities: reconciliation.pendingActivities,
    patch: {
      ...reconciliation.patch,
      upsert: [...reconciliation.patch.upsert, ...bridge.activities] as ApiActivity[],
      evidenceActivities,
      removeIds: [...reconciliation.patch.removeIds, ...bridge.removedIds],
    },
  };
}

function fetchTokenActivitySlice(
  accountId: string,
  limit: number,
  tokenSlug: string,
  toTimestamp?: number,
  signal?: AbortSignal,
): Promise<RawActivitySliceResult> {
  const chain = getChainBySlug(tokenSlug);
  return fetchAndCheckActivitySlice(chain, {
    accountId,
    tokenSlug,
    toTimestamp,
    limit,
    ...(signal && { signal }),
  });
}

async function fetchAllActivitySlice(
  accountId: string,
  limit: number,
  toTimestamp?: number,
  signal?: AbortSignal,
): Promise<ActivitySliceResult> {
  const account = await fetchStoredAccount(accountId);
  // `getOrderedAccountChains` drops stored keys absent from CHAIN_CONFIG; without it a stale
  // chain crashes `getChainConfig(...).chainStandard` and silently aborts the whole slice.
  const accountChains = getOrderedAccountChains(account.byChain);

  const deduplicatedChains = unique(accountChains.map((chain) => getChainConfig(chain).chainStandard || chain));

  // `Promise.allSettled` so a single chain failure (transient API error, unknown token, stale account)
  // does not erase the whole batch. Failed chains contribute an empty slice; the rest stay visible.
  const settled = await Promise.allSettled(
    // The `fetchActivitySlice` method of all chains must return sorted activities
    deduplicatedChains.map((chain) =>
      fetchAndCheckActivitySlice(chain, {
        accountId,
        toTimestamp,
        limit,
        ...(signal && { signal }),
      }, { shouldFetchCrossChain: true }),
    ),
  );
  throwIfAborted(signal);

  let firstRejection: Error | undefined;
  const results: RawActivitySliceResult[] = settled.map((settledResult, index) => {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    }
    logDebugError(`fetchAllActivitySlice ${deduplicatedChains[index]}`, settledResult.reason);
    firstRejection ??= settledResult.reason;
    return { activities: [], hasMore: true, incompleteTraceIds: [] };
  });

  // If every chain came back empty and at least one failed, we cannot tell "real end of history"
  // from "transient outage". Surface the failure so `fetchPastActivities` returns `undefined` and
  // the UI retries on the next scroll instead of marking the history as ended.
  if (firstRejection && results.every((r) => !r.activities.length)) {
    throw firstRejection;
  }

  const activities = mergeSortedActivitiesToMaxTime(...results.map((r) => r.activities));
  const hasMore = results.some((r) => r.hasMore);

  return { activities, hasMore };
}

export function decryptComment(accountId: string, activity: ApiTransactionActivity, enclaveToken?: string) {
  const { encryptedComment } = activity;
  if (!encryptedComment) {
    return activity.comment ?? '';
  }

  const chain = getActivityChains(activity)[0];
  if (chain) {
    return chains[chain].decryptComment({ accountId, activity: { ...activity, encryptedComment }, enclaveToken });
  }

  return '';
}

export async function fetchActivityDetails(accountId: string, activity: ApiActivity, signal?: AbortSignal) {
  if (activity.kind === 'swap') return fetchBridgeActivityDetails(accountId, activity, signal);

  const account = await fetchStoredAccount(accountId);
  for (const chain of getActivityChains(activity)) {
    if (!account.byChain[chain]) continue;
    const newActivity = await chains[chain].fetchActivityDetails(accountId, activity, signal);
    throwIfAborted(signal);
    if (newActivity) {
      return newActivity;
    }
  }

  return activity;
}

export async function fetchTransactionById(
  { chain, network, walletAddress, ...restOptions }: ApiFetchTransactionByIdOptions & { chain: ApiChain },
): Promise<ApiActivity[]> {
  const isTxId = 'txId' in restOptions;
  const options = isTxId
    ? { chain, network, txId: restOptions.txId, walletAddress }
    : { chain, network, txHash: restOptions.txHash, walletAddress };

  logDebug('fetchTransactionById', options);

  return chains[chain].fetchTransactionById(options);
}

async function fetchAndCheckActivitySlice(
  chain: ApiChain,
  options: ApiFetchActivitySliceOptions,
  {
    shouldFetchCrossChain = false,
  }: { shouldFetchCrossChain?: boolean } = {},
): Promise<RawActivitySliceResult> {
  const chainStandard = getChainConfig(chain).chainStandard;

  let activities: ApiActivity[] = [];
  let explicitHasMore: boolean | undefined;

  if (chain === 'bnb') {
    const account = await fetchStoredAccount(options.accountId);
    const wallet = account.byChain.bnb;
    if (!wallet) throw new Error('BNB wallet missing');

    const result = await getEvmTokenActivitySlice('bnb', parseAccountId(options.accountId).network,
      wallet.address, options.tokenSlug, options.toTimestamp, options.fromTimestamp, options.limit,
      undefined, options.signal);
    activities = result.activities;
    explicitHasMore = result.hasMore || result.isBackfilling;
  } else if (shouldFetchCrossChain && chainStandard && !options.tokenSlug) {
    activities = await chains[chain].crosschain!.fetchCrossChainActivitySlice(options);
  } else {
    activities = await chains[chain].fetchActivitySlice(options);
  }
  throwIfAborted(options.signal);

  // const activities = await chains[chain].fetchActivitySlice(options);

  // Sorting is important for `mergeSortedActivities`, so it's checked in the debug mode
  if (DEBUG && !areActivitiesSortedAndUnique(activities)) {
    logDebugError(`The all activity slice of ${chain} is not sorted properly or has duplicates`, options);
  }

  // When we receive exactly `limit` activities, the last trace might be incomplete
  // (e.g., only some swap actions without the fee transfer). We trim that trace
  // so it will be loaded completely on the next page. Sorting may move another
  // action from the same trace outside the contiguous tail, so the reconciler
  // must still treat the boundary trace as incomplete in the current slice.
  if (options.limit && activities.length === options.limit) {
    const trimmedActivities = trimPageBoundaryTraceActivities(activities);
    const incompleteTraceId = getLastPageTraceBoundaryId(activities);
    return {
      activities: trimmedActivities,
      hasMore: true,
      incompleteTraceIds: incompleteTraceId ? [incompleteTraceId] : [],
    };
  }

  return {
    activities,
    hasMore: explicitHasMore ?? false,
    incompleteTraceIds: [],
  };
}
