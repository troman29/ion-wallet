import type { GlobalState } from './types';

import { normalizeTokenIdentity, normalizeTokenSlug, normalizeTokenSlugKeys } from '../util/tokenSlug';

export function migrateTokenSlugs(cached: GlobalState) {
  if (cached.tokenInfo?.bySlug) {
    cached.tokenInfo.bySlug = normalizeTokenSlugKeys(cached.tokenInfo.bySlug);
    cached.tokenInfo.bySlug = Object.fromEntries(Object.values(cached.tokenInfo.bySlug).map((token) => {
      const normalizedToken = normalizeTokenIdentity(token);
      return [normalizedToken.slug, normalizedToken];
    }));
  }
  if (cached.tokenPriceHistory?.bySlug) {
    cached.tokenPriceHistory.bySlug = normalizeTokenSlugKeys(cached.tokenPriceHistory.bySlug);
  }
  if (cached.stakingDefault) {
    cached.stakingDefault.tokenSlug = normalizeTokenSlug(cached.stakingDefault.tokenSlug);
  }
  if (cached.currentTransfer?.tokenSlug) {
    cached.currentTransfer.tokenSlug = normalizeTokenSlug(cached.currentTransfer.tokenSlug);
  }

  Object.values(cached.byAccountId ?? {}).forEach((account) => {
    if (account.balances?.bySlug) {
      account.balances.bySlug = normalizeTokenSlugKeys(account.balances.bySlug);
    }
    if (account.currentTokenSlug) account.currentTokenSlug = normalizeTokenSlug(account.currentTokenSlug);
    if (account.invoiceTokenSlug) account.invoiceTokenSlug = normalizeTokenSlug(account.invoiceTokenSlug);
    Object.values(account.staking?.stateById ?? {}).forEach((state) => {
      state.tokenSlug = normalizeTokenSlug(state.tokenSlug);
    });

    // Refetch history with canonical slugs, including all pagination and pending-activity indexes.
    delete account.activities;
    delete account.currentActivityId;
    delete account.activitiesUpdateStartedAt;
    delete account.activityReturnContentTab;
  });

  Object.values(cached.settings.byAccountId ?? {}).forEach((settings) => {
    const listKeys = [
      'pinnedSlugs', 'alwaysShownSlugs', 'alwaysHiddenSlugs', 'deletedSlugs', 'importedSlugs',
    ] as const;
    listKeys.forEach((key) => {
      if (settings[key]) settings[key] = Array.from(new Set(settings[key].map(normalizeTokenSlug)));
    });
  });
}
