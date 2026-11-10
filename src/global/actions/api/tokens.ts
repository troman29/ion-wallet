import type { LangCode, TokenDetailsState } from '../../types';

import { callApi } from '../../../api';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { updateTokenDetails, updateTokenPriceHistory } from '../../reducers/tokens';

type TokenDetailsRequest = { langCode: LangCode; startedAt: number };
const REQUEST_TIMEOUT = 30000;
const pendingTokenDetailsRequests = new Map<string, TokenDetailsRequest>();

addActionHandler('loadTokenDetails', async (global, actions, { slugs }) => {
  const request: TokenDetailsRequest = { langCode: global.settings.langCode, startedAt: Date.now() };
  const requestedSlugs = [...new Set(slugs)].filter((slug) => {
    const pending = pendingTokenDetailsRequests.get(slug);
    return !pending || pending.langCode !== request.langCode
      || request.startedAt - pending.startedAt >= REQUEST_TIMEOUT;
  });
  if (!requestedSlugs.length) return;

  requestedSlugs.forEach((slug) => pendingTokenDetailsRequests.set(slug, request));
  const result = await callApi('fetchTokenInfo', requestedSlugs, request.langCode);
  const ownSlugs = requestedSlugs.filter((slug) => pendingTokenDetailsRequests.get(slug) === request);
  ownSlugs.forEach((slug) => pendingTokenDetailsRequests.delete(slug));
  if (!ownSlugs.length) return;

  global = getGlobal();
  if (global.settings.langCode !== request.langCode) return;
  const partial: Record<string, TokenDetailsState> = {};
  for (const slug of ownSlugs) {
    partial[slug] = result
      ? { data: result.detailsBySlug[slug], langCode: request.langCode, fetchedAt: Date.now(), hasError: undefined }
      : {
        hasError: true,
        langCode: request.langCode,
        data: global.tokenDetails.bySlug[slug]?.langCode === request.langCode
          ? global.tokenDetails.bySlug[slug]?.data : undefined,
      };
  }
  setGlobal(updateTokenDetails(global, partial));
});

addActionHandler('initApi', () => {
  pendingTokenDetailsRequests.clear();
});

addActionHandler('loadPriceHistory', async (global, actions, payload) => {
  const { slug, period, currency = global.settings.baseCurrency } = payload ?? {};
  const { baseCurrency } = global.settings;

  const history = await callApi('fetchPriceHistory', slug, period, currency);

  global = getGlobal();
  // The history is not stored per currency, and the chart asks for a new series on every currency
  // change, so a result awaited across such a change belongs to no longer shown prices
  if (global.settings.baseCurrency !== baseCurrency) {
    return;
  }

  const cachedHistory = global.tokenPriceHistory.bySlug[slug]?.[period];
  global = updateTokenPriceHistory(global, slug, { [period]: history ?? cachedHistory ?? [] });
  setGlobal(global);
});
