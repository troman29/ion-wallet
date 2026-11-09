import type { ApiNetwork } from '../../../types';
import type { AnyAction, MetadataMap, NftItemMetadata, NftItemsResponse } from './types';

import { getDnsDomainZone, getDnsZoneByCollection } from '../../../../util/dns';
import { split } from '../../../../util/iteratees';
import { logDebugError } from '../../../../util/logs';
import { toBase64Address } from '../util/tonCore';
import { callToncenterV3 } from './other';

const MAX_ITEMS_PER_REQUEST = 100;

// The name of an item never changes, so a known one (or knowing it is not a domain) is kept for the session
const nameByRawAddress = new Map<string, string | undefined>();

// The ION indexer does not fetch off-chain NFT metadata, so a DNS item is named by the URI its collection builds
export function getDnsItemMetadataByContentUri(
  network: ApiNetwork,
  rawCollectionAddress?: string,
  contentUri?: string,
): NftItemMetadata | undefined {
  const base = contentUri?.match(/\/item-([^/]+)\.json$/)?.[1];
  if (!rawCollectionAddress || !base) {
    return undefined;
  }

  const zone = getDnsZoneByCollection(toBase64Address(rawCollectionAddress, true, network));
  if (!zone) {
    return undefined;
  }

  const domain = `${base}.${zone.suffixes[0]}`;
  return getDnsDomainZone(domain)?.zone === zone ? { type: 'nft_items', name: domain } : undefined;
}

/** Adds the metadata of the DNS items the actions refer to, so their activities show the domain */
export async function fillDnsNftMetadata(network: ApiNetwork, actions: AnyAction[], metadata: MetadataMap) {
  const rawAddresses = new Set<string>();
  for (const action of actions) {
    const rawAddress = getActionNftAddress(action);
    if (rawAddress && !metadata[rawAddress]?.is_indexed) {
      rawAddresses.add(rawAddress);
    }
  }

  const rawsToFetch = [...rawAddresses].filter((raw) => !nameByRawAddress.has(raw));

  try {
    await Promise.all(split(rawsToFetch, MAX_ITEMS_PER_REQUEST).map(async (raws) => {
      const { nft_items: items } = await callToncenterV3<NftItemsResponse>(network, '/nft/items', {
        address: raws,
        limit: raws.length,
      });

      raws.forEach((raw) => nameByRawAddress.set(raw, undefined));
      for (const item of items) {
        const name = getDnsItemMetadataByContentUri(network, item.collection_address ?? undefined, item.content?.uri)
          ?.name;
        nameByRawAddress.set(item.address, name);
      }
    }));
  } catch (err) {
    logDebugError('fillDnsNftMetadata', err);
  }

  for (const raw of rawAddresses) {
    const name = nameByRawAddress.get(raw);
    if (name) {
      metadata[raw] = { is_indexed: true, token_info: [{ type: 'nft_items', name }] };
    }
  }
}

function getActionNftAddress(action: AnyAction) {
  switch (action.type) {
    case 'nft_transfer':
      return action.details.nft_item;
    case 'change_dns':
    case 'delete_dns':
    case 'renew_dns':
      return action.details.asset ?? undefined;
    default:
      return undefined;
  }
}
