import type { ApiActivity, ApiFetchActivitySliceOptions, ApiNetwork, EVMChain } from '../../types';
import type { BnbHistoryItem, BnbHistoryResponse } from './types';

import { parseAccountId } from '../../../util/account';
import { getChainConfig } from '../../../util/chain';
import { fetchStoredWallet } from '../../common/accounts';
import { callBackendGet } from '../../common/backend';
import { updateActivityMetadata } from '../../common/helpers';
import { buildTokenSlug, getTokenBySlug } from '../../common/tokens';
import { normalizeAddress } from './address';

export async function fetchActivitySlice(
  chain: EVMChain,
  { accountId, tokenSlug, toTimestamp, fromTimestamp, limit, signal }: ApiFetchActivitySliceOptions,
): Promise<ApiActivity[]> {
  const { network } = parseAccountId(accountId);
  const { address } = await fetchStoredWallet(accountId, chain);

  const { activities } = await getTokenActivitySlice(
    chain, network, address, tokenSlug, toTimestamp, fromTimestamp, limit, undefined, signal,
  );

  return activities;
}

export function fetchCrossChainActivitySlice(options: ApiFetchActivitySliceOptions): Promise<ApiActivity[]> {
  return fetchActivitySlice('bnb', options);
}

export async function getTokenActivitySlice(
  chain: EVMChain,
  network: ApiNetwork,
  address: string,
  slug?: string,
  toTimestamp?: number,
  fromTimestamp?: number,
  limit?: number,
  _isCrossChain?: boolean,
  signal?: AbortSignal,
): Promise<{ activities: ApiActivity[]; hasMore: boolean; isBackfilling: boolean }> {
  const { items, hasMore, isBackfilling } = await fetchBnbHistory(network, address, {
    before: toTimestamp,
    after: fromTimestamp,
    limit,
    token: getHistoryToken(chain, slug),
  }, signal);

  return { activities: items.map((item) => transformBnbItem(chain, item, address)), hasMore, isBackfilling };
}

export async function fetchActivitiesByHash(chain: EVMChain, network: ApiNetwork, address: string, hash: string) {
  const { items } = await fetchBnbHistory(network, address, { hash });

  return items.map((item) => transformBnbItem(chain, item, address));
}

function fetchBnbHistory(
  network: ApiNetwork,
  address: string,
  params: { before?: number; after?: number; limit?: number; token?: string; hash?: string },
  signal?: AbortSignal,
): Promise<BnbHistoryResponse> {
  if (network !== 'mainnet') {
    return Promise.resolve({ items: [], hasMore: false, isBackfilling: false });
  }
  return callBackendGet<BnbHistoryResponse>(`/bnb/history/${address}`, params, undefined, signal);
}

function getHistoryToken(chain: EVMChain, slug?: string) {
  if (!slug) {
    return undefined;
  }

  return slug === getChainConfig(chain).nativeToken.slug ? 'native' : getTokenBySlug(slug)?.tokenAddress;
}

export function transformBnbItem(chain: EVMChain, item: BnbHistoryItem, address: string): ApiActivity {
  const ownAddress = normalizeAddress(address);
  const fromAddress = normalizeAddress(item.from);
  const toAddress = normalizeAddress(item.to);
  const isIncoming = toAddress === ownAddress && fromAddress !== ownAddress;
  const amount = BigInt(item.amount);
  const isContractCall = item.kind === 'native' && amount === 0n;
  // The backend folds calls that moved BNB or ION into those transfers, so a call left alone only paid its fee
  // for other tokens; ION approvals and failed calls stay visible
  const isUnrelatedCall = isContractCall && !item.isFailed && !isIonToken(chain, item.to);

  return updateActivityMetadata({
    id: item.id,
    kind: 'transaction',
    timestamp: item.timestamp,
    comment: undefined,
    fromAddress,
    toAddress,
    amount: isIncoming ? amount : -amount,
    slug: item.kind === 'token' && item.token
      ? buildTokenSlug(chain, item.token)
      : getChainConfig(chain).nativeToken.slug,
    isIncoming,
    normalizedAddress: ownAddress,
    fee: BigInt(item.fee ?? 0),
    status: item.isFailed ? 'failed' : 'completed',
    externalMsgHashNorm: item.hash,
    ...(isContractCall && { type: 'callContract' as const }),
    ...(isUnrelatedCall && { shouldHide: true }),
  });
}

export function fetchActivityDetails() {
  return undefined;
}

function isIonToken(chain: EVMChain, address: string) {
  return getChainConfig(chain).tokenInfo
    .some(({ tokenAddress }) => tokenAddress?.toLowerCase() === address.toLowerCase());
}
