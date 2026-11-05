import { Contract, isError } from 'ethers';

import type {
  ApiAddressInfo, ApiNetwork, ApiTokenWithMaybePrice, EVMChain, StampedBalances,
} from '../../types';
import type { BnbBalancesResponse } from './types';
import { ApiCommonError } from '../../types';

import { throwIfAborted } from '../../../util/abortSignal';
import { getChainConfig, getIsTokenKept } from '../../../util/chain';
import { fetchWithRetry } from '../../../util/fetch';
import { getEvmProvider } from './util/client';
import { getKnownAddressInfo } from '../../common/addresses';
import { updateTokens } from '../../common/tokens';
import { isValidAddress } from './address';
import { getBnbApiUrl } from './constants';

export async function getWalletBalance(chain: EVMChain, network: ApiNetwork, address: string) {
  return getEvmProvider(network, chain).getBalance(address);
}

export async function getWalletTransactionCount(chain: EVMChain, network: ApiNetwork, address: string) {
  return getEvmProvider(network, chain).getTransactionCount(address);
}

export function fetchCrosschainAccountAssets(
  network: ApiNetwork,
  address: string,
  sendUpdateTokens: NoneToVoidFunction,
  options?: { signal?: AbortSignal },
) {
  return fetchAccountAssets('bnb', network, address, sendUpdateTokens, {
    isCrossChain: true,
    ...(options?.signal && { signal: options.signal }),
  });
}

/** The chain registry consumes balances alone: nothing there merges sources, so no stamp is needed. */
export async function fetchAccountBalances(
  chain: EVMChain,
  network: ApiNetwork,
  address: string,
  sendUpdateTokens: NoneToVoidFunction,
  options: { isCrossChain?: boolean; signal?: AbortSignal } = {},
) {
  return (await fetchAccountAssets(chain, network, address, sendUpdateTokens, options)).balances;
}

export async function fetchCrosschainAccountBalances(
  network: ApiNetwork,
  address: string,
  sendUpdateTokens: NoneToVoidFunction,
  options?: { signal?: AbortSignal },
) {
  return (await fetchCrosschainAccountAssets(network, address, sendUpdateTokens, options)).balances;
}

/** How far ahead of this device's clock a corrected observation instant may sit and still be trusted. */
const MAX_SNAPSHOT_CLOCK_SKEW = 5 * 60 * 1000; // 5 min

// When several accounts share the same EVM address, their independent poll timers can fire
// identical positions requests at once. This map coalesces concurrent identical fetches into a
// single in-flight request; entries are deleted as soon as the request settles, so positions stay
// uncached across poll cycles.
//
// The resolved snapshot is the SAME object instance returned to every coalesced caller,
// so it MUST be treated as read-only. A caller that needs to mutate the result must copy it first,
// otherwise it would corrupt a sibling account that coalesced onto the same fetch.
const inFlightPositions = new Map<string, Promise<StampedBalances>>();

export function fetchAccountAssets(
  chain: EVMChain,
  network: ApiNetwork,
  address: string,
  sendUpdateTokens: NoneToVoidFunction,
  options: { isCrossChain?: boolean; signal?: AbortSignal } = {},
): Promise<StampedBalances> {
  const { isCrossChain = false, signal } = options;
  if (signal) {
    return fetchAccountAssetsUncoalesced(chain, network, address, sendUpdateTokens, options);
  }

  // The address is lowercased so the same wallet passed in different casing (EIP-55 checksummed vs
  // lowercase) still coalesces onto one request. The `isCrossChain` component is required so a
  // cross-chain ethereum fetch does not collide with a single-chain ethereum fetch for the same address.
  const key = `${network}:${chain}:${address.toLowerCase()}:${isCrossChain ? 1 : 0}`;

  const existing = inFlightPositions.get(key);
  if (existing) {
    return existing;
  }

  const promise = fetchAccountAssetsUncoalesced(chain, network, address, sendUpdateTokens, options)
    .finally(() => {
      inFlightPositions.delete(key);
    });

  inFlightPositions.set(key, promise);

  return promise;
}

async function fetchBalancesSnapshot(network: ApiNetwork, address: string, signal?: AbortSignal) {
  const url = `${getBnbApiUrl(network)}/balances/${address}`;
  const response = await fetchWithRetry(url, signal ? { signal } : undefined);

  return {
    data: (await response.json()) as BnbBalancesResponse,
    snapshotAt: readSnapshotAt(response),
  };
}

/**
 * Reads the observation instant and states it on this device's clock. The backend stamps the
 * instant by its own clock while socket deltas are stamped by ours, so a device whose clock is
 * off would rank every snapshot wrong in one direction or the other. The response's own Date is
 * the same event seen by the backend clock, so the gap between it and arrival is the offset
 * between the two, and adding it puts both stamps on one clock. Without a readable Date there is
 * nothing to correct by, and an instant that still sits further ahead than MAX_SNAPSHOT_CLOCK_SKEW
 * is reported as none at all: it would outrank every delta for as long as the account lives, and
 * arrival ordering is the safer answer.
 */
function readSnapshotAt(response: Response) {
  const raw = response.headers.get('X-Snapshot-At');
  if (!raw) return undefined;

  const snapshotAt = Number(raw);
  if (!Number.isFinite(snapshotAt) || snapshotAt <= 0) return undefined;

  const now = Date.now();
  const responseAt = Date.parse(response.headers.get('Date') ?? '');
  const observedAt = Number.isFinite(responseAt) ? snapshotAt + (now - responseAt) : snapshotAt;

  return observedAt <= now + MAX_SNAPSHOT_CLOCK_SKEW ? observedAt : undefined;
}

async function fetchAccountAssetsUncoalesced(
  chain: EVMChain,
  network: ApiNetwork,
  address: string,
  sendUpdateTokens: NoneToVoidFunction,
  options: { isCrossChain?: boolean; signal?: AbortSignal },
): Promise<StampedBalances> {
  const { signal } = options;
  const { data, snapshotAt: asOf } = await fetchBalancesSnapshot(network, address, signal);
  throwIfAborted(signal);

  const { nativeToken, tokenInfo } = getChainConfig(chain);
  const balances: Record<string, bigint> = { [nativeToken.slug]: BigInt(data.native) };
  const tokens: ApiTokenWithMaybePrice[] = [{ priceUsd: undefined, percentChange24h: undefined, ...nativeToken }];

  for (const token of tokenInfo) {
    if (!token.tokenAddress || !getIsTokenKept(chain, token.slug)) {
      continue;
    }
    balances[token.slug] = BigInt(data.tokens[token.tokenAddress.toLowerCase()] ?? 0);
    tokens.push({ priceUsd: undefined, percentChange24h: undefined, ...token });
  }

  await updateTokens(tokens, sendUpdateTokens, true);

  return { balances, asOf };
}

export async function getErc20Balance(
  network: ApiNetwork,
  chain: EVMChain,
  ownerAddress: string,
  tokenAddress: string,
) {
  try {
    const contract = new Contract(
      tokenAddress,
      ['function balanceOf(address owner) view returns (uint256)'],
      getEvmProvider(network, chain),
    );

    const balance = await contract.balanceOf(ownerAddress);

    return BigInt(balance.toString());
  } catch (err) {
    if (isError(err, 'BAD_DATA') || isError(err, 'CALL_EXCEPTION')) {
      return 0n;
    }

    throw err;
  }
}

export function getWalletLastTransaction(_network: ApiNetwork, _address: string) {
  return Promise.resolve(undefined);
}

export const getAddressInfo = (
  chain: EVMChain,
  network: ApiNetwork,
  addressOrDomain: string,
): ApiAddressInfo | { error: ApiCommonError } => {
  if (!isValidAddress(addressOrDomain)) {
    return { error: ApiCommonError.InvalidAddress };
  }

  return {
    resolvedAddress: addressOrDomain,
    addressName: getKnownAddressInfo(addressOrDomain)?.name,
  };
};
