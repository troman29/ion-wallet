import type { ApiBackendTokenDetails, ApiTokenDetails } from '../types';

import { SECOND } from '../../util/dateFormat';
import { isValidUrl } from '../../util/url';

const LINK_ORDER = ['x', 'telegram', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'reddit', 'website'];

export function buildTokenDetails(info: NonNullable<ApiBackendTokenDetails['tokenInfo']>): ApiTokenDetails {
  const timestamp = info.createdAt ? Date.parse(info.createdAt) : NaN;
  const buy = getNonNegativeNumber(info.volume24h?.buy);
  const sell = getNonNegativeNumber(info.volume24h?.sell);
  const total = getNonNegativeNumber(info.volume24h?.total)
    ?? (buy !== undefined && sell !== undefined ? getNonNegativeNumber(buy + sell) : undefined);
  const percentChange = info.volume24h?.percentChange;

  return {
    description: info.localizedDescription || info.description,
    links: info.links?.filter(({ url, type }) => isValidUrl(url)
      && (type === undefined || LINK_ORDER.includes(type)))
      .map(({ url, type }) => ({ url, kind: type ?? 'website' }))
      .sort((a, b) => LINK_ORDER.indexOf(a.kind) - LINK_ORDER.indexOf(b.kind)),
    marketCap: getNonNegativeNumber(info.marketCap),
    circulatingSupply: getNonNegativeNumber(info.supply?.circulating),
    totalSupply: getNonNegativeNumber(info.supply?.total),
    createdAt: Number.isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp / SECOND) : undefined,
    volume24h: total === undefined ? undefined : {
      total, buy, sell,
      change: typeof percentChange === 'number' && Number.isFinite(percentChange) ? percentChange / 100 : undefined,
    },
  };
}

function getNonNegativeNumber(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}
