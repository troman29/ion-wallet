import type { AccountSettings } from '../../types';

import { DEFAULT_CHAIN } from '../../../config';
import { debounce } from '../../../util/schedulers';
import { callApi } from '../../../api';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { updateAccountSettings } from '../../reducers';

const CHECK_OWNERSHIP_DEBOUNCE_MS = 3000;

// Debounced to avoid API rate limits: NFT update events fire per-account, causing a burst of ownership checks
const accountIdsToCheckCardNftOwnership = new Set<string>();

const checkCardNftOwnershipDebounced = debounce(() => {
  const byAccountId = getGlobal().settings.byAccountId;

  accountIdsToCheckCardNftOwnership.forEach((accountId) => {
    const settings = byAccountId[accountId];
    if (settings) {
      void checkOwnershipForAccount(accountId, settings);
    }
  });

  accountIdsToCheckCardNftOwnership.clear();
}, CHECK_OWNERSHIP_DEBOUNCE_MS, false, true);

addActionHandler('checkCardNftOwnership', (global, actions, payload) => {
  const { accountId } = payload || {};

  if (accountId) {
    accountIdsToCheckCardNftOwnership.add(accountId);
  } else {
    Object.keys(global.settings.byAccountId).forEach((id) => accountIdsToCheckCardNftOwnership.add(id));
  }

  checkCardNftOwnershipDebounced();
});

async function checkOwnershipForAccount(accountId: string, settings: AccountSettings) {
  const cardBackgroundNftAddress = settings.cardBackgroundNft?.address;
  const accentColorNftAddress = settings.accentColorNft?.address;

  if (!cardBackgroundNftAddress && !accentColorNftAddress) return;

  const chain = settings.accentColorNft?.chain || DEFAULT_CHAIN;

  const [isCardBackgroundNftOwned, isAccentColorNftOwned] = await Promise.all([
    cardBackgroundNftAddress
      ? callApi('checkNftOwnership', chain, accountId, cardBackgroundNftAddress)
      : undefined,
    accentColorNftAddress && accentColorNftAddress !== cardBackgroundNftAddress
      ? callApi('checkNftOwnership', chain, accountId, accentColorNftAddress)
      : undefined,
  ]);

  let newGlobal = getGlobal();
  const newAccountSettings = newGlobal.settings.byAccountId[accountId];

  if (cardBackgroundNftAddress && isCardBackgroundNftOwned === false
    && newAccountSettings?.cardBackgroundNft?.address === cardBackgroundNftAddress) {
    newGlobal = updateAccountSettings(newGlobal, accountId, {
      cardBackgroundNft: undefined,
    });
  }

  if (accentColorNftAddress
    && newAccountSettings?.accentColorNft?.address === accentColorNftAddress
    && (
      (accentColorNftAddress === cardBackgroundNftAddress && isCardBackgroundNftOwned === false)
      || (accentColorNftAddress !== cardBackgroundNftAddress && isAccentColorNftOwned === false)
    )) {
    newGlobal = updateAccountSettings(newGlobal, accountId, {
      accentColorNft: undefined,
      accentColorIndex: undefined,
    });
  }

  setGlobal(newGlobal);
}
