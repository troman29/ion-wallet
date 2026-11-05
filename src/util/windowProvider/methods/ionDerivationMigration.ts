import { getGlobal, setGlobal } from '../../../global';

import type { ApiDerivation } from '../../../api/types';

import { GLOBAL_STATE_CACHE_DISABLED, GLOBAL_STATE_CACHE_KEY } from '../../../config';
import { saveGlobalCacheNow } from '../../../global/cache';

export function commitIonDerivationMigration(
  accountId: string,
  oldAddress: string,
  newAddress: string,
  derivation: ApiDerivation,
) {
  const global = getGlobal();
  const account = global.accounts?.byId[accountId];
  const oldChain = account?.byChain.ton;
  if (!account || !oldChain || (oldChain.address !== oldAddress && oldChain.address !== newAddress)) {
    return false;
  }

  const nextGlobal = {
    ...global,
    accounts: {
      ...global.accounts,
      byId: {
        ...global.accounts?.byId,
        [accountId]: {
          ...account,
          byChain: {
            ...account.byChain,
            ton: { address: newAddress, derivation, legacyIonAddress: oldAddress },
          },
        },
      },
    },
    byAccountId: {
      ...global.byAccountId,
      [accountId]: {
        ...global.byAccountId[accountId],
        balances: undefined,
        activities: undefined,
        staking: undefined,
        nfts: undefined,
      },
    },
  };

  saveGlobalCacheNow(nextGlobal);
  if (!GLOBAL_STATE_CACHE_DISABLED) {
    const saved = JSON.parse(localStorage.getItem(GLOBAL_STATE_CACHE_KEY) ?? '{}');
    if (saved.accounts?.byId?.[accountId]?.byChain?.ton?.address !== newAddress) {
      return false;
    }
  }

  setGlobal(nextGlobal);
  return getGlobal().accounts?.byId[accountId]?.byChain.ton?.address === newAddress;
}
