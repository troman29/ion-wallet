import type { Account, GlobalState } from '../types';

import { selectHasAuth, selectHasPassword, selectIsBridgeAvailable } from './accounts';

const MNEMONIC_ACCOUNT = { title: 'Wallet', type: 'mnemonic', byChain: {} } as unknown as Account;
const VIEW_ACCOUNT = { title: 'Wallet', type: 'view', byChain: {} } as unknown as Account;

function buildGlobal(accounts: Record<string, Account>, authTypes?: GlobalState['authTypes']): GlobalState {
  return {
    authTypes,
    currentAccountId: Object.keys(accounts)[0],
    settings: { isTestnet: false },
    accounts: { byId: accounts },
  } as unknown as GlobalState;
}

describe('auth-state selectors', () => {
  it('sees no password in an empty wallet', () => {
    const global = buildGlobal({});

    expect(selectHasAuth(global)).toBe(false);
    expect(selectHasPassword(global)).toBe(false);
  });

  it('sees a password once the Enclave is provisioned', () => {
    const global = buildGlobal({ '0-mainnet': MNEMONIC_ACCOUNT }, ['passcode']);

    expect(selectHasAuth(global)).toBe(true);
    expect(selectHasPassword(global)).toBe(true);
  });

  it('sees no password in a view-only wallet', () => {
    const global = buildGlobal({ '0-mainnet': VIEW_ACCOUNT });

    expect(selectHasPassword(global)).toBe(false);
  });
});

describe('bridge availability', () => {
  const ionWallet = { address: 'ion-address' };
  const bnbWallet = { address: 'bnb-address' };

  it.each([
    ['ION-only', 'mnemonic', { ton: ionWallet }, false],
    ['BNB-only', 'mnemonic', { bnb: bnbWallet }, false],
    ['multichain', 'mnemonic', { ton: ionWallet, bnb: bnbWallet }, true],
    ['view-only multichain', 'view', { ton: ionWallet, bnb: bnbWallet }, false],
  ])('shows the bridge appropriately for a %s account', (_label, type, byChain, isExpectedAvailable) => {
    const account = { title: 'Wallet', type, byChain } as Account;

    expect(selectIsBridgeAvailable(buildGlobal({ '0-mainnet': account }))).toBe(isExpectedAvailable);
  });

  it('updates when switching from a multichain account to an ION-only account', () => {
    const global = buildGlobal({
      '0-mainnet': { ...MNEMONIC_ACCOUNT, byChain: { ton: ionWallet, bnb: bnbWallet } } as Account,
      '1-mainnet': { ...MNEMONIC_ACCOUNT, byChain: { ton: ionWallet } } as Account,
    });

    expect(selectIsBridgeAvailable(global)).toBe(true);
    expect(selectIsBridgeAvailable({ ...global, currentAccountId: '1-mainnet' })).toBe(false);
  });
});
