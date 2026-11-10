import type { ApiToken } from '../api/types';

import { IONCOIN } from '../config';
import getChainNetworkIcon from './getChainNetworkIcon';
import { getIsNativeToken } from './tokens';

import ionChainBadge from '../assets/blockchain/badge_ion.svg';

export default function getTokenChainIcon(token: Pick<ApiToken, 'slug' | 'chain'>) {
  if (token.slug === IONCOIN.slug) return ionChainBadge;
  if (getIsNativeToken(token.slug)) return undefined;

  return getChainNetworkIcon(token.chain);
}
