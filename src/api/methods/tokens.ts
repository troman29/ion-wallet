import type { ApiBackendTokenDetails, ApiChain, ApiTokenDetails, OnApiUpdate } from '../types';

import { parseAccountId } from '../../util/account';
import { logDebugError } from '../../util/logs';
import { normalizeTokenSlug } from '../../util/tokenSlug';
import chains from '../chains';
import { callBackendPost } from '../common/backend';
import { buildTokenDetails } from '../common/tokenDetails';
import { getTokenBySlug, sendUpdateTokens, tokensPreload } from '../common/tokens';

export { buildTokenSlug } from '../common/tokens';

export async function fetchTokenInfo(slugs: string[], langCode: string) {
  await tokensPreload.promise;
  const requestedSlugs = new Set(slugs.map(normalizeTokenSlug));
  const assets = [...requestedSlugs].flatMap((slug) => {
    const token = getTokenBySlug(slug);
    return token ? [`${token.chain}:${token.tokenAddress ?? token.symbol}`] : [];
  });
  const detailsBySlug: Record<string, ApiTokenDetails> = {};
  if (!assets.length) return { detailsBySlug };

  try {
    const response = await callBackendPost<ApiBackendTokenDetails[]>(
      `/assets?langCode=${encodeURIComponent(langCode)}`, { assets }, { timeout: 10000 },
    );
    for (const { slug, tokenInfo } of response) {
      const normalizedSlug = normalizeTokenSlug(slug);
      if (tokenInfo && requestedSlugs.has(normalizedSlug)) {
        detailsBySlug[normalizedSlug] = buildTokenDetails(tokenInfo);
      }
    }
    return { detailsBySlug };
  } catch (err) {
    logDebugError('fetchTokenInfo', err);
    return undefined;
  }
}

export function fetchToken(accountId: string, chain: ApiChain, tokenAddress: string) {
  const { network } = parseAccountId(accountId);
  return chains[chain].fetchToken(network, tokenAddress);
}

let onUpdate: OnApiUpdate | undefined;

export function initTokens(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export async function importToken(accountId: string, chain: ApiChain, tokenAddress: string) {
  const { network } = parseAccountId(accountId);
  await chains[chain].importToken(network, tokenAddress, () => onUpdate && sendUpdateTokens(onUpdate));
}
