import type { ApiActivityTimestamps, OnApiUpdate } from '../types';

import { IS_EXTENSION } from '../../config';
import { getOrderedAccountChains } from '../../util/chain';
import { logDebugError } from '../../util/logs';
import {
  fetchMaybeStoredAccount,
  fetchStoredAccount,
  fetchStoredAccounts,
  getAccountChains,
  getCurrentAccountId,
  loginResolve,
} from '../common/accounts';
import { sendUpdateTokens } from '../common/tokens';
import { callHook } from '../hooks';
import { storage } from '../storages';
import { setActivePollingAccount } from './polling';

let onUpdate: OnApiUpdate;

export function initAccounts(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export async function activateAccount(
  accountId: string,
  newestActivityTimestamps: ApiActivityTimestamps = {},
  shouldResetBalances?: boolean,
) {
  const prevAccountId = await getCurrentAccountId();
  const isFirstLogin = !prevAccountId;

  // Detached on purpose: activation keeps the behaviour it has for every account, known or not. The check only
  // records the disagreement between the two account stores, which is silent today.
  void reportUnknownAccount(accountId, prevAccountId);

  await storage.setItem('currentAccountId', accountId);
  loginResolve();

  if (IS_EXTENSION) {
    void callHook('onFirstLogin');
  }

  if (isFirstLogin) {
    sendUpdateTokens(onUpdate);
  }

  void setActivePollingAccount(accountId, newestActivityTimestamps, shouldResetBalances);
}

/**
 * The frontend cache and the worker storage hold the account list independently, with no point where one is
 * reconciled against the other. When they diverge, every later read of this account throws `Account <id> doesn't
 * exist` from deep inside polling, naming neither the divergence nor the state the app was in. Report it once,
 * at the only place that knows the account the frontend asked for.
 */
async function reportUnknownAccount(accountId: string, prevAccountId?: string) {
  try {
    if (await fetchMaybeStoredAccount(accountId)) return;

    logDebugError('activateAccount: the account is missing from the worker storage', {
      accountId,
      // Spelled out, because an undefined field would vanish from the serialized entry and read as an omission.
      prevAccountId: prevAccountId ?? 'none',
      // Account ids carry no secrets, and the surviving set is what tells a lost update apart from a wiped store.
      // Sorted so that the same set folds into one entry however the storage happens to order its keys.
      storedAccountIds: Object.keys(await fetchStoredAccounts()).sort(),
    });
  } catch (err) {
    logDebugError('activateAccount: failed to inspect the worker account storage', accountId, err);
  }
}

export async function loadAccountsDerivations() {
  const accounts = await fetchStoredAccounts();
  for (const [accountId, account] of Object.entries(accounts)) {
    const byChain = account.byChain;

    // `getOrderedAccountChains` filters out stored keys that are no longer in CHAIN_CONFIG,
    // so they don't propagate into global state via `updateAccount`.
    for (const chain of getOrderedAccountChains(byChain)) {
      const wallet = byChain[chain];
      if (!wallet?.derivation) continue;

      onUpdate({
        type: 'updateAccount',
        accountId,
        chain,
        derivation: {
          path: wallet.derivation.path,
          index: wallet.derivation.index,
          label: wallet.derivation.label,
        },
      });
    }
  }
}

export async function fetchStoredAccountSummary(accountId: string) {
  const account = await fetchStoredAccount(accountId);
  return {
    byChain: getAccountChains(account),
  };
}

export async function deactivateAllAccounts() {
  void setActivePollingAccount(undefined, {});
  await storage.removeItem('currentAccountId');

  if (IS_EXTENSION) {
    void callHook('onFullLogout');
  }
}
