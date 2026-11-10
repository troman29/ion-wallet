import type { ApiToken } from '../api/types';

import { BNB, ION_BNB_MAINNET, IONCOIN, STAKED_ION_SLUG } from '../config';

import bnbIcon from '../assets/blockchain/chain_bnb.svg';
import ionIcon from '../assets/blockchain/chain_ton.svg';
import lionIcon from '../assets/tokens/lion.svg';

export default function getTokenImage({ slug, image }: Pick<ApiToken, 'slug' | 'image'>) {
  if (slug === STAKED_ION_SLUG) return lionIcon;
  if (slug === IONCOIN.slug || slug === ION_BNB_MAINNET.slug) return ionIcon;
  if (slug === BNB.slug) return bnbIcon;
  return image;
}
