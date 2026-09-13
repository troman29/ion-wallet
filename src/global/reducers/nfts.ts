import type { ApiNft } from '../../api/types';
import type { GlobalState } from '../types';

import isEmptyObject from '../../util/isEmptyObject';
import { selectAccountState } from '../selectors';
import { updateAccountState } from './misc';

export function addNft(global: GlobalState, accountId: string, nft: ApiNft, shouldAppendToEnd?: boolean) {
  const nftAddress = nft.address;
  const nfts = selectAccountState(global, accountId)?.nfts;
  const orderedAddresses = (nfts?.orderedAddresses ?? []).filter((address) => address !== nftAddress);
  const byAddress = { ...nfts?.byAddress, [nftAddress]: nft };

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts,
      byAddress,
      orderedAddresses: shouldAppendToEnd
        ? orderedAddresses.concat(nftAddress)
        : [nftAddress, ...orderedAddresses],
    },
  });
}

export function removeNft(global: GlobalState, accountId: string, nftAddress: string) {
  const nfts = selectAccountState(global, accountId)!.nfts;
  const orderedAddresses = (nfts?.orderedAddresses ?? []).filter((address) => address !== nftAddress);
  const selectedNfts = (nfts?.selectedNfts ?? []).filter((nft) => nft.address !== nftAddress);
  const { [nftAddress]: removedNft, ...byAddress } = nfts?.byAddress ?? {};

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts,
      byAddress,
      orderedAddresses,
      selectedNfts,
    },
  });
}

export function replaceNft(global: GlobalState, accountId: string, nft: ApiNft) {
  const nfts = selectAccountState(global, accountId)?.nfts;
  if (!nfts?.byAddress?.[nft.address]) return global;

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts,
      byAddress: {
        ...nfts.byAddress,
        [nft.address]: nft,
      },
    },
  });
}

export function updateNft(global: GlobalState, accountId: string, nftAddress: string, partial: Partial<ApiNft>) {
  const nfts = selectAccountState(global, accountId)!.nfts;
  const nft = nfts?.byAddress?.[nftAddress];
  if (!nfts || !nft) return global;

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts,
      byAddress: {
        ...nfts.byAddress,
        [nftAddress]: { ...nft, ...partial },
      },
    },
  });
}

export function addToSelectedNfts(
  global: GlobalState,
  accountId: string,
  nftsToAdd: ApiNft[],
) {
  const accountNfts = selectAccountState(global, accountId)!.nfts;
  const selectedNfts = [...(accountNfts?.selectedNfts ?? []), ...nftsToAdd];

  return updateAccountState(global, accountId, {
    nfts: {
      ...accountNfts!,
      selectedNfts,
    },
  });
}

export function removeFromSelectedNfts(global: GlobalState, accountId: string, nftAddress: string) {
  const nfts = selectAccountState(global, accountId)!.nfts;
  const selectedNfts = (nfts?.selectedNfts ?? []).filter((nft) => nft.address !== nftAddress);

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts!,
      selectedNfts: selectedNfts.length ? selectedNfts : undefined,
    },
  });
}

// Buying an NFT is an explicit intent to own it, so it stays visible even if its collection is untrusted
export function whitelistNft(global: GlobalState, accountId: string, nftAddress: string): GlobalState {
  const { blacklistedNftAddresses = [], whitelistedNftAddresses = [] } = selectAccountState(global, accountId) ?? {};
  if (whitelistedNftAddresses.includes(nftAddress)) return global;

  return updateAccountState(global, accountId, {
    blacklistedNftAddresses: blacklistedNftAddresses.filter((address) => address !== nftAddress),
    whitelistedNftAddresses: [...whitelistedNftAddresses, nftAddress],
  });
}

// Socket updates mirror the regular NFT polling state without treating any collection specially.
export function applyIncomingNftFromActivity(global: GlobalState, accountId: string, nft: ApiNft): GlobalState {
  return addNft(global, accountId, nft);
}

export function applyOutgoingNftFromActivity(
  global: GlobalState,
  accountId: string,
  nft: ApiNft,
  _newOwnerAddress?: string,
): GlobalState {
  return removeNft(global, accountId, nft.address);
}

export function addUnorderedNfts(
  global: GlobalState,
  accountId: string,
  updatedNfts?: Record<string, ApiNft>,
): GlobalState {
  if (!updatedNfts || isEmptyObject(updatedNfts)) {
    return global;
  }

  const { byAddress } = selectAccountState(global, accountId)?.nfts || { byAddress: {} };

  Object.values(updatedNfts).forEach((nft) => {
    const existingNft = byAddress?.[nft.address];
    if (existingNft) {
      // The refreshed NFT is complete, so it replaces the stored one - a field-by-field merge would keep
      // flags the new data has dropped, such as `isUnverified` of a collection that has become trusted
      global = replaceNft(global, accountId, nft);
    } else {
      global = addNft(global, accountId, nft, true);
    }
  });

  return global;
}
