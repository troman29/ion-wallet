import type { ApiTokenWithPrice } from '../../api/types';
import type { GlobalState, PriceHistoryPeriods, TokenDetailsState } from '../types';

export function updateTokenDetails(global: GlobalState, partial: Record<string, TokenDetailsState>): GlobalState {
  const bySlug = { ...global.tokenDetails.bySlug };
  for (const [slug, details] of Object.entries(partial)) {
    bySlug[slug] = { ...bySlug[slug], ...details };
  }
  return { ...global, tokenDetails: { bySlug } };
}

export function clearTokenPriceHistory(global: GlobalState): GlobalState {
  return { ...global, tokenPriceHistory: { bySlug: {} } };
}

export function updateTokenPriceHistory(global: GlobalState, slug: string, partial: PriceHistoryPeriods): GlobalState {
  const { bySlug } = global.tokenPriceHistory;

  return {
    ...global,
    tokenPriceHistory: {
      bySlug: {
        ...bySlug,
        [slug]: {
          ...bySlug[slug],
          ...partial,
        },
      },
    },
  };
}

export function updateTokenInfo(global: GlobalState, partial: Record<string, ApiTokenWithPrice>): GlobalState {
  return {
    ...global,
    tokenInfo: {
      ...global.tokenInfo,
      bySlug: {
        ...global.tokenInfo.bySlug,
        ...partial,
      },
    },
  };
}
