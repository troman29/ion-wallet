import type { ApiToken } from '../api/types';

import { BNB, ION_BNB_MAINNET, TONCOIN } from '../config';

import bnbIcon from '../assets/blockchain/chain_bnb.svg';
import ionIcon from '../assets/blockchain/chain_ton.svg';

export default function getTokenImage({ slug, image }: Pick<ApiToken, 'slug' | 'image'>) {
  if (slug === TONCOIN.slug || slug === ION_BNB_MAINNET.slug) return ionIcon;
  if (slug === BNB.slug) return bnbIcon;
  return image;
}
