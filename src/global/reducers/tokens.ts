import type { ApiTokenWithPrice } from '../../api/types';
import type { GlobalState, PriceHistoryPeriods, TokenDetailsState } from '../types';

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

export function updateTokenDetails(global: GlobalState, slug: string, partial: TokenDetailsState): GlobalState {
  const { bySlug } = global.tokenDetails;

  return {
    ...global,
    tokenDetails: {
      bySlug: {
        ...bySlug,
        [slug]: { ...bySlug[slug], ...partial },
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
