import chains from '../chains';
import { setActivePollingAccount } from './polling';

jest.mock('../chains', () => ({
  __esModule: true,
  default: {
    ton: { setupActivePolling: jest.fn(() => jest.fn()) },
    bnb: { setupActivePolling: jest.fn(() => jest.fn()) },
  },
}));
jest.mock('../common/accounts', () => ({
  fetchStoredAccount: jest.fn().mockResolvedValue({}),
  fetchStoredAccounts: jest.fn().mockResolvedValue({}),
  fetchMaybeStoredAccount: jest.fn().mockResolvedValue(undefined),
  doesAccountHaveChain: jest.fn().mockReturnValue(true),
}));

it('passes ION jetton history timestamps to ton polling and keeps BNB timestamps separate', async () => {
  try {
    await setActivePollingAccount('0-mainnet', { ioncoin: 1, 'ion-EQjetton': 2, bnb: 3, 'bnb-0x123': 4 });
    expect(jest.mocked(chains.ton.setupActivePolling).mock.calls[0][4]).toEqual({ ioncoin: 1, 'ion-EQjetton': 2 });
    expect(jest.mocked(chains.bnb.setupActivePolling).mock.calls[0][4]).toEqual({ bnb: 3, 'bnb-0x123': 4 });
  } finally {
    await setActivePollingAccount(undefined, {});
  }
});
