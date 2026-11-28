import React from '../../../../lib/teact/teact';
import TeactDOM from '../../../../lib/teact/teact-dom';
import { setGlobal } from '../../../../global';

import type { AccountType } from '../../../../global/types';
import { ContentTab } from '../../../../global/types';

import { ANIMATION_LEVEL_MIN } from '../../../../config';
import { INITIAL_STATE } from '../../../../global/initialState';
import { cloneDeep } from '../../../../util/iteratees';
import { waitForCondition } from '../../../../../tests/util/async';

import Activities from './Activities';

const ACCOUNT_ID = '0-mainnet';
const PUBLIC_BNB_ADDRESS = '0x0000000000000000000000000000000000000001';
const NEW_WALLET_GREETING = 'You have just created a new wallet';

let root: HTMLDivElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

it.each([
  ['view', 'No transactions to show for this address.'],
  ['mnemonic', NEW_WALLET_GREETING],
] as const)('shows the correct empty history for a %s account', async (accountType, expectedMessage) => {
  renderEmptyHistory(accountType);

  await waitForCondition(() => Boolean(root.textContent?.includes(expectedMessage)), {
    failureMessage: `Expected “${expectedMessage}”, found “${root.textContent}”.`,
  });
  if (accountType === 'view') {
    expect(root.textContent).not.toContain(NEW_WALLET_GREETING);
  }
});

function renderEmptyHistory(accountType: AccountType) {
  const state = cloneDeep(INITIAL_STATE);
  state.settings.animationLevel = ANIMATION_LEVEL_MIN;
  state.currentAccountId = ACCOUNT_ID;
  state.accounts = {
    byId: {
      [ACCOUNT_ID]: { title: 'Fixture', type: accountType, byChain: { bnb: { address: PUBLIC_BNB_ADDRESS } } },
    },
  };
  state.byAccountId = {
    [ACCOUNT_ID]: {
      activeContentTab: ContentTab.Activity,
      activities: { byId: {}, idsMain: [], isMainHistoryEndReached: true },
    },
  };
  setGlobal(state);
  TeactDOM.render(<Activities isActive />, root);
}
