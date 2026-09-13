import { useMemo } from '../../../../../lib/teact/teact';

import type { ApiNft } from '../../../../../api/types';
import type { DropdownItem } from '../../../../ui/Dropdown';

import { buildNftCollectionIndex } from '../../../../../global/helpers/nfts';

import useLang from '../../../../../hooks/useLang';

export const HIDDEN_NFTS_VALUE = 'hidden_nfts';

export default function useNftCollectionMenuItems({
  nfts,
  blacklistedNftAddresses,
  whitelistedNftAddresses,
  areUnverifiedNftsHidden,
}: {
  nfts?: Record<string, ApiNft>;
  blacklistedNftAddresses?: string[];
  whitelistedNftAddresses?: string[];
  areUnverifiedNftsHidden?: boolean;
}) {
  const lang = useLang();

  return useMemo(() => {
    const { byKey, totalVisibleCount } = buildNftCollectionIndex(
      nfts, blacklistedNftAddresses, whitelistedNftAddresses, areUnverifiedNftsHidden,
    );

    const unnamedLabel = lang('Unnamed Collection');

    const nameByKey = new Map<string, string>();
    const items: DropdownItem[] = [];

    for (const [key, { chain, address, name }] of byKey) {
      const resolvedName = name || unnamedLabel;
      nameByKey.set(key, resolvedName);
      items.push({ value: `${address}@${chain}`, name: resolvedName, noTranslate: true });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));

    const blacklistedSet = new Set(blacklistedNftAddresses);
    const shouldRenderHiddenNftsSection = Object.values(nfts ?? {}).some(
      (nft) => blacklistedSet.has(nft.address) || nft.isHidden || (areUnverifiedNftsHidden && nft.isUnverified),
    );

    return { items, nameByKey, shouldRenderHiddenNftsSection, byKey, totalVisibleCount };
  }, [lang, nfts, blacklistedNftAddresses, whitelistedNftAddresses, areUnverifiedNftsHidden]);
}
