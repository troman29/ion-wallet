import type { Account, AccountType } from '../global/types';

import { DEBUG_VIEW_ACCOUNTS } from '../config';

export default function isViewAccount(accountType?: AccountType) {
  return !DEBUG_VIEW_ACCOUNTS && accountType === 'view';
}

export function getIsViewAccountDisabled(account: Account) {
  // A view-only wallet has no signing key, so the signing
  // pickers treat it as watch-only instead of letting a person fill in a form that can only end on a refusal.
  return isViewAccount(account.type);
}
