import type { ApiToken } from '../api/types';

import { IONCOIN } from '../config';
import getChainNetworkIcon from './getChainNetworkIcon';
import { getIsNativeToken } from './tokens';

export default function getTokenChainIcon(token: Pick<ApiToken, 'slug' | 'chain'>) {
  if (getIsNativeToken(token.slug) && token.slug !== IONCOIN.slug) return undefined;

  return getChainNetworkIcon(token.chain);
}
