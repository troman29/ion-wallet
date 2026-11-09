import type { ApiNetwork } from '../../../types';
import type { AddressBook } from './types';

import { HOUR, MINUTE } from '../../../../util/dateFormat';
import { split } from '../../../../util/iteratees';
import { logDebugError } from '../../../../util/logs';
import { callBackendPost } from '../../../common/backend';

const NAME_CACHE_TTL = HOUR;
// A domain linked to an address shows up after this time; the backend keeps a missing name as long
const NO_NAME_CACHE_TTL = 10 * MINUTE;
const MAX_ADDRESSES_PER_REQUEST = 100;
const REQUEST_TIMEOUT = 3000;
// The indexer gives wallets (and uninitialized accounts) in the non-bounceable form, contracts in the bounceable one
const WALLET_ADDRESS_PREFIX = 'UQ';

const cache = new Map<string, { name?: string; expiresAt: number }>();
const inFlight = new Map<string, Promise<void>>();

/** Fills the `.ion` names the indexer lacks, so the activities show them instead of the counterparty addresses */
export async function fillAddressBookNames(network: ApiNetwork, addressBook: AddressBook) {
  // ION DNS exists on the mainnet only
  if (network !== 'mainnet') {
    return;
  }

  const now = Date.now();
  const requests = new Set<Promise<void>>();
  const rawsToFetch: string[] = [];

  for (const [raw, { domain, user_friendly: address }] of Object.entries(addressBook)) {
    if (domain || !address.startsWith(WALLET_ADDRESS_PREFIX)) {
      continue;
    }

    const request = inFlight.get(raw);
    if (request) {
      requests.add(request);
    } else if ((cache.get(raw)?.expiresAt ?? 0) <= now) {
      rawsToFetch.push(raw);
    }
  }

  for (const raws of split(rawsToFetch, MAX_ADDRESSES_PER_REQUEST)) {
    const request = fetchNames(raws.map((raw) => [raw, addressBook[raw].user_friendly])).finally(() => {
      raws.forEach((raw) => inFlight.delete(raw));
    });
    raws.forEach((raw) => inFlight.set(raw, request));
    requests.add(request);
  }

  await Promise.all(requests);
  applyCachedNames(addressBook);
}

/** Synchronous variant for the socket, which cannot wait for the backend */
export function applyCachedNames(addressBook: AddressBook) {
  const now = Date.now();

  for (const [raw, entry] of Object.entries(addressBook)) {
    const cached = cache.get(raw);
    if (!entry.domain && cached?.name && cached.expiresAt > now) {
      entry.domain = cached.name;
    }
  }
}

async function fetchNames(addresses: [raw: string, userFriendly: string][]) {
  try {
    const names = await callBackendPost<Record<string, string>>(
      '/dns/names',
      { addresses: addresses.map(([, userFriendly]) => userFriendly) },
      { timeout: REQUEST_TIMEOUT },
    );
    const now = Date.now();
    for (const [raw, userFriendly] of addresses) {
      const name = names[userFriendly];
      cache.set(raw, { name, expiresAt: now + (name ? NAME_CACHE_TTL : NO_NAME_CACHE_TTL) });
    }
  } catch (err) {
    // Names are cosmetic: the history must load even when the backend is down
    logDebugError('fillAddressBookNames', err);
  }
}
