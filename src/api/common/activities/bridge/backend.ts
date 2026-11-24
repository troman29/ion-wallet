import { Address } from '@ton/core';

import type {
  ApiActivity, ApiBridgeOperation, ApiBridgeOperationChanges, ApiBridgeOperationPage, ApiSwapActivity,
} from '../../../types';

import { throwIfAborted } from '../../../../util/abortSignal';
import { parseAccountId } from '../../../../util/account';
import { getActivityTokenSlugs } from '../../../../util/activities';
import { fetchStoredAccount } from '../../accounts';
import { callBackendGet } from '../../backend';
import { getBackendConfigCacheSync } from '../../cache';
import { buildBridgeActivity, getBridgeActivityId } from './projection';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const REFRESH_INTERVAL_MS = 10_000;

type BridgeScope = { network: 'mainnet' | 'testnet'; tonAddress?: string; bnbAddress?: string };
type BridgeCache = {
  operations: Map<string, ApiBridgeOperation>;
  cursor?: string;
  syncCursor?: string;
  isExhausted: boolean;
  isBackfilling: boolean;
  refreshedAt: number;
  removedIds: Set<string>;
  unverifiedIds: Set<string>;
  historyThroughTimestamp?: number;
  hasPendingChanges?: boolean;
  retryAt?: number;
  pending?: Promise<void>;
};

const cacheByScope = new Map<string, BridgeCache>();
const activeByScope = new Map<string, { cursor?: string; operations: Map<string, ApiBridgeOperation> }>();

export async function fetchActiveBridgeOperations(accountId: string): Promise<ApiBridgeOperation[]> {
  if (getBackendConfigCacheSync()?.isBridgeHistoryEnabled !== true) return [];

  const account = await fetchStoredAccount(accountId);
  const scope: BridgeScope = {
    network: parseAccountId(accountId).network,
    tonAddress: account.byChain.ton?.address,
    bnbAddress: account.byChain.bnb?.address,
  };
  const key = JSON.stringify([accountId, scope]);
  const cache = activeByScope.get(key) ?? { operations: new Map<string, ApiBridgeOperation>() };
  activeByScope.set(key, cache);
  try {
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
      const page = await callBackendGet<ApiBridgeOperationPage>('/bridge/operations/active', {
        ...scope, cursor: cache.cursor, limit: PAGE_SIZE,
      });
      for (const operation of page.items) {
        if (isValidOperation(operation) && operation.network === scope.network && belongsToScope(operation, scope)) {
          const previous = cache.operations.get(operation.id);
          if (!previous || BigInt(previous.revision) <= BigInt(operation.revision)) {
            cache.operations.set(operation.id, operation);
          }
        }
      }
      const previousCursor = cache.cursor;
      cache.cursor = page.nextCursor;
      if (!page.hasMore || !page.nextCursor || page.nextCursor === previousCursor) break;
    }
  } catch {
    // A previous verified active operation remains usable while the endpoint is unavailable.
  }

  return [...cache.operations.values()];
}

export async function fetchBridgeOperation(accountId: string, id: string, signal?: AbortSignal) {
  if (getBackendConfigCacheSync()?.isBridgeHistoryEnabled !== true) return undefined;

  const account = await fetchStoredAccount(accountId);
  const scope: BridgeScope = {
    network: parseAccountId(accountId).network,
    tonAddress: account.byChain.ton?.address,
    bnbAddress: account.byChain.bnb?.address,
  };
  try {
    const operation = await callBackendGet<ApiBridgeOperation>(`/bridge/operations/${encodeURIComponent(id)}`,
      scope, undefined, signal);

    return isValidOperation(operation) && operation.network === scope.network && belongsToScope(operation, scope)
      ? operation : undefined;
  } catch {
    throwIfAborted(signal);
    return undefined;
  }
}

export async function fetchBridgeHistory(
  accountId: string,
  previous: readonly ApiActivity[] = [],
  options: { toTimestamp?: number; throughTimestamp?: number; tokenSlug?: string; signal?: AbortSignal } = {},
) {
  if (getBackendConfigCacheSync()?.isBridgeHistoryEnabled !== true) {
    return { activities: [] as ApiSwapActivity[], removedIds: [] as string[], hasMore: false,
      isAvailable: false, isBackfilling: false };
  }

  const account = await fetchStoredAccount(accountId);
  const scope: BridgeScope = {
    network: parseAccountId(accountId).network,
    tonAddress: account.byChain.ton?.address,
    bnbAddress: account.byChain.bnb?.address,
  };
  const key = JSON.stringify([accountId, scope]);
  let cache = cacheByScope.get(key);
  if (!cache) {
    cache = {
      operations: new Map(), isExhausted: false, isBackfilling: false, refreshedAt: 0,
      removedIds: new Set(), unverifiedIds: new Set(),
    };
    cacheByScope.set(key, cache);
  }

  for (const activity of previous) {
    if (activity.kind === 'swap' && isValidOperation(activity.operation)
      && activity.operation.network === scope.network && belongsToScope(activity.operation, scope)) {
      if (!cache.operations.has(activity.operation.id) && !cache.removedIds.has(activity.operation.id)) {
        cache.unverifiedIds.add(activity.operation.id);
      }
      storeOperation(cache, activity.operation, scope, false);
    }
  }

  let isAvailable = true;
  try {
    if (cache.retryAt && Date.now() < cache.retryAt) throw new Error('Bridge history unavailable');

    if (cache.pending) await cache.pending;
    const pending = refreshHistory(cache, scope, options.throughTimestamp, options.signal);
    cache.pending = pending;
    try {
      await pending;
    } finally {
      if (cache.pending === pending) cache.pending = undefined;
    }
  } catch (err) {
    throwIfAborted(options.signal);
    isAvailable = false;
    if (!cache.retryAt || cache.retryAt <= Date.now()) cache.retryAt = Date.now() + REFRESH_INTERVAL_MS;
  }

  // Source-time overlays may arrive after the raw cursor passed them; returning them again is safe because ids deduplicate.
  const activities = [...cache.operations.values()].map(buildBridgeActivity).filter((activity) =>
    !options.tokenSlug || getActivityTokenSlugs(activity).includes(options.tokenSlug));

  return {
    activities,
    removedIds: [...cache.removedIds].map((id) => getBridgeActivityId(id, scope.network)),
    hasMore: !isAvailable || !cache.isExhausted || cache.isBackfilling
      || Boolean(cache.hasPendingChanges) || cache.unverifiedIds.size > 0,
    isAvailable,
    isBackfilling: cache.isBackfilling,
    coverageTimestamp: !cache.isExhausted ? cache.historyThroughTimestamp : undefined,
  };
}

export async function fetchBridgeActivityDetails(accountId: string, activity: ApiSwapActivity, signal?: AbortSignal) {
  const account = await fetchStoredAccount(accountId);
  try {
    const path = `/bridge/operations/${encodeURIComponent(activity.operation.id)}`;
    const operation = await callBackendGet<ApiBridgeOperation>(path, {
      network: parseAccountId(accountId).network,
      tonAddress: account.byChain.ton?.address,
      bnbAddress: account.byChain.bnb?.address,
    }, undefined, signal);

    return isValidOperation(operation) && operation.network === activity.operation.network
      && BigInt(operation.revision) >= BigInt(activity.operation.revision)
      ? buildBridgeActivity(operation) : activity;
  } catch (err) {
    throwIfAborted(signal);
    return activity;
  }
}

async function refreshHistory(cache: BridgeCache, scope: BridgeScope, throughTimestamp?: number, signal?: AbortSignal) {
  if (cache.syncCursor && (cache.hasPendingChanges || Date.now() - cache.refreshedAt >= REFRESH_INTERVAL_MS)) {
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
      const page: ApiBridgeOperationChanges = await callBackendGet<ApiBridgeOperationChanges>(
        '/bridge/operations/changes', { ...scope, after: cache.syncCursor, limit: PAGE_SIZE }, undefined, signal,
      );
      for (const operation of page.items) {
        cache.removedIds.delete(operation.id);
        storeOperation(cache, operation, scope);
      }
      for (const id of page.removedIds) {
        cache.operations.delete(id);
        cache.unverifiedIds.delete(id);
        cache.removedIds.add(id);
      }
      const previousCursor = cache.syncCursor;
      cache.syncCursor = page.nextCursor;
      cache.isBackfilling = page.isBackfilling;
      cache.hasPendingChanges = page.hasMore;
      if (!page.hasMore || page.nextCursor === previousCursor) break;
    }
  }

  for (let pageIndex = 0; pageIndex < MAX_PAGES && !cache.isExhausted; pageIndex++) {
    if (cache.cursor && throughTimestamp !== undefined
      && cache.historyThroughTimestamp !== undefined && cache.historyThroughTimestamp < throughTimestamp) break;

    const page = await callBackendGet<ApiBridgeOperationPage>('/bridge/operations', {
      ...scope, cursor: cache.cursor, limit: PAGE_SIZE,
    }, undefined, signal);
    for (const operation of page.items) storeOperation(cache, operation, scope);
    if (page.items.length) {
      cache.historyThroughTimestamp = Math.min(...page.items.map(({ timestamp }) => timestamp));
    }
    cache.syncCursor ??= page.syncCursor;
    cache.isBackfilling = page.isBackfilling;
    cache.isExhausted = !page.hasMore && !page.isBackfilling;
    const previousCursor = cache.cursor;
    cache.cursor = page.nextCursor;
    if (!page.hasMore || !page.nextCursor || previousCursor === page.nextCursor
      || throughTimestamp === undefined) break;
  }
  if (!cache.isBackfilling) await revalidateCachedOperations(cache, scope, signal);
  cache.refreshedAt = Date.now();
  cache.retryAt = undefined;
}

function storeOperation(cache: BridgeCache, operation: ApiBridgeOperation, scope: BridgeScope, isVerified = true) {
  if (cache.removedIds.has(operation.id) || !isValidOperation(operation)
    || operation.network !== scope.network || !belongsToScope(operation, scope)) return;

  const previous = cache.operations.get(operation.id);
  if (previous && BigInt(previous.revision) > BigInt(operation.revision)) return;

  cache.operations.set(operation.id, operation);
  if (isVerified) cache.unverifiedIds.delete(operation.id);
}

/** A removal before this session's changes cursor is found by its scoped detail endpoint. */
async function revalidateCachedOperations(cache: BridgeCache, scope: BridgeScope, signal?: AbortSignal) {
  const ids = [...cache.unverifiedIds].slice(0, 5);
  const responses = await Promise.allSettled(ids.map((id) =>
    callBackendGet<ApiBridgeOperation>(`/bridge/operations/${encodeURIComponent(id)}`, scope, undefined, signal)));
  for (let index = 0; index < responses.length; index++) {
    const response = responses[index];
    if (response.status === 'fulfilled') {
      storeOperation(cache, response.value, scope);
    } else if ((response.reason as { statusCode?: number })?.statusCode === 404) {
      cache.operations.delete(ids[index]);
      cache.unverifiedIds.delete(ids[index]);
      cache.removedIds.add(ids[index]);
    }
  }
}

function isValidOperation(operation: ApiBridgeOperation) {
  return Boolean(operation.id) && /^\d+$/.test(operation.revision)
    && /^\d+$/.test(operation.amount) && /^\d+$/.test(operation.receiveAmount)
    && (operation.bridgeFee === undefined || /^\d+$/.test(operation.bridgeFee))
    && Number.isFinite(operation.timestamp) && operation.timestamp > 0
    && ['pending', 'confirming', 'waiting', 'claimable', 'claiming', 'completed', 'failed'].includes(operation.status)
    && ['ton', 'bnb'].includes(operation.source)
    && Array.isArray(operation.components) && Array.isArray(operation.fees);
}

function belongsToScope(operation: ApiBridgeOperation, scope: BridgeScope) {
  return operation.source === 'ton'
    ? normalizeTonAddress(operation.fromAddress) === normalizeTonAddress(scope.tonAddress)
    || operation.toAddress.toLowerCase() === scope.bnbAddress?.toLowerCase()
    : normalizeTonAddress(operation.toAddress) === normalizeTonAddress(scope.tonAddress)
      || operation.fromAddress.toLowerCase() === scope.bnbAddress?.toLowerCase();
}

function normalizeTonAddress(address?: string) {
  try {
    return address && Address.parse(address).toRawString();
  } catch {
    return address;
  }
}
