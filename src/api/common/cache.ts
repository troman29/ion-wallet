import type { ApiBackendConfig, ApiChain, ApiStakingCommonData } from '../types';

import Deferred from '../../util/Deferred';

export type AccountCache = { stakedAt?: number };

const stakingCommonCacheByChain: Partial<Record<ApiChain, ApiStakingCommonData>> = {};
const stakingCommonDeferredByChain: Partial<Record<ApiChain, Deferred>> = {};

const accountCache: Record<string, AccountCache> = {};

let backendConfig: ApiBackendConfig | undefined;
const configDeferred = new Deferred();

export function getAccountCache(accountId: string, address: string) {
  return accountCache[`${accountId}:${address}`] ?? {};
}

export function updateAccountCache(accountId: string, address: string, partial: Partial<AccountCache>) {
  const key = `${accountId}:${address}`;
  accountCache[key] = { ...accountCache[key], ...partial };
}

export function setStakingCommonCache(chain: ApiChain, data: ApiStakingCommonData) {
  stakingCommonCacheByChain[chain] = data;
  getStakingCommonDeferred(chain).resolve();
}

export async function getStakingCommonCache(chain: ApiChain) {
  await getStakingCommonDeferred(chain).promise;
  return stakingCommonCacheByChain[chain]!;
}

function getStakingCommonDeferred(chain: ApiChain) {
  const deferred = stakingCommonDeferredByChain[chain] ?? new Deferred();
  stakingCommonDeferredByChain[chain] = deferred;
  return deferred;
}

export function setBackendConfigCache(config: ApiBackendConfig) {
  backendConfig = config;
  configDeferred.resolve();
}

/** Returns the config provided by the backend */
export async function getBackendConfigCache() {
  await configDeferred.promise;
  return backendConfig!;
}

/** Synchronous variant: returns the config only if it has already arrived, otherwise `undefined`. */
export function getBackendConfigCacheSync() {
  return backendConfig;
}
