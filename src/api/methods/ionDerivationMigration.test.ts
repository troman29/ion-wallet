import { LIQUID_JETTON } from '../../config';
import { pause } from '../../util/schedulers';
import { callWindow } from '../../util/windowProvider/connector';
import { getKeyPairFromStoredMnemonic, getWalletFromBip39Mnemonic } from '../chains/ton/auth';
import { submitGasfullTransfer } from '../chains/ton/transfer';
import { fetchBalances, getWalletInfo } from '../chains/ton/wallet';
import { fetchStoredAccount, fetchStoredAccounts, getCurrentAccountId } from '../common/accounts';
import { getBackendConfigCacheSync } from '../common/cache';
import { getMnemonic } from '../common/mnemonic';
import { storage } from '../storages';
import {
  initIonDerivationMigration, migrateLegacyIonDerivations,
  reconcileIonDerivationMigrations,
} from './ionDerivationMigration';
import { recoverLegacyIonFunds } from './ionLegacyRecovery';

jest.mock('../../util/windowProvider/connector', () => ({ callWindow: jest.fn() }));
jest.mock('../../util/schedulers', () => ({
  ...jest.requireActual('../../util/schedulers'),
  pause: jest.fn(() => Promise.resolve()),
}));
jest.mock('../chains/ton/auth', () => ({
  getWalletFromBip39Mnemonic: jest.fn(), getKeyPairFromStoredMnemonic: jest.fn(),
}));
jest.mock('../chains/ton/transfer', () => ({ submitGasfullTransfer: jest.fn() }));
jest.mock('../chains/ton/wallet', () => ({ getWalletInfo: jest.fn(), fetchBalances: jest.fn() }));
jest.mock('../common/accounts', () => ({
  fetchStoredAccount: jest.fn(), fetchStoredAccounts: jest.fn(), getCurrentAccountId: jest.fn(),
}));
jest.mock('../common/cache', () => ({ getBackendConfigCacheSync: jest.fn() }));
jest.mock('../common/mnemonic', () => ({ getMnemonic: jest.fn(), validateBip39Mnemonic: jest.fn(() => true) }));
jest.mock('../storages', () => ({ storage: { getItem: jest.fn(), mutateItem: jest.fn() } }));
jest.mock('./auth', () => ({ buildTonBackendAuthToken: jest.fn() }));
jest.mock('./polling', () => ({
  addPollingAccount: jest.fn(), removePollingAccount: jest.fn(), setActivePollingAccount: jest.fn(),
}));

const accountId = '0-mainnet';
const oldWallet = {
  address: 'old-address', publicKey: 'a'.repeat(64), version: 'W5', index: 0,
  derivation: { path: 'm/44\'/607\'/{index}\'', index: 0 },
};
const newWallet = {
  ...oldWallet, address: 'new-address', publicKey: 'b'.repeat(64),
  derivation: { path: 'm/44\'/696365\'/{index}\'', index: 0 },
};
const lionSlug = `ton-${LIQUID_JETTON}`;
let oldIon: bigint;
let newIon: bigint;
let oldLion: bigint;
let newLion: bigint;
let oldSeqno: number;
let records: Record<string, any>;
let acceptsUiCommit: boolean;

beforeEach(() => {
  jest.clearAllMocks();
  oldIon = 10_000_000_000n;
  newIon = 0n;
  oldLion = 2_000_000_000n;
  newLion = 0n;
  oldSeqno = 1;
  acceptsUiCommit = true;
  records = {
    accounts: { [accountId]: { type: 'bip39', byChain: { ton: oldWallet } } },
    ionDerivationMigrations: {},
  };
  jest.mocked(storage.getItem).mockImplementation((key) => Promise.resolve(records[key]));
  jest.mocked(storage.mutateItem!).mockImplementation((key, mutate) => {
    records[key] = mutate(records[key]);
    return Promise.resolve();
  });
  jest.mocked(fetchStoredAccounts).mockImplementation(() => Promise.resolve(records.accounts));
  jest.mocked(fetchStoredAccount).mockImplementation(() => Promise.resolve(records.accounts[accountId]));
  jest.mocked(getCurrentAccountId).mockResolvedValue(undefined);
  jest.mocked(getMnemonic).mockResolvedValue(['abandon']);
  jest.mocked(getWalletFromBip39Mnemonic).mockResolvedValue([newWallet] as any);
  jest.mocked(getKeyPairFromStoredMnemonic).mockResolvedValue({
    publicKey: Buffer.from(oldWallet.publicKey, 'hex'),
  } as any);
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({ isLegacyIonRecoveryEnabled: true } as any);
  jest.mocked(getWalletInfo).mockImplementation((_network, address) => Promise.resolve({
    address: address as string,
    balance: address === oldWallet.address ? oldIon : newIon,
    seqno: address === oldWallet.address ? oldSeqno : 0,
    isInitialized: true,
  }));
  jest.mocked(fetchBalances).mockImplementation((_network, address) => Promise.resolve({
    toncoin: address === oldWallet.address ? oldIon : newIon,
    [lionSlug]: address === oldWallet.address ? oldLion : newLion,
  }));
  jest.mocked(callWindow).mockImplementation((...args: any[]) => Promise.resolve((
    args[0] === 'commitIonDerivationMigration' ? acceptsUiCommit : true
  ) as any));
  initIonDerivationMigration(jest.fn());
});

it('changes the account address without broadcasting or moving either balance', async () => {
  expect(await migrateLegacyIonDerivations('unlocked-token')).toEqual({});
  expect(records.accounts[accountId].byChain.ton.address).toBe(newWallet.address);
  expect(records.ionDerivationMigrations[accountId].committed).toBe(true);
  expect(submitGasfullTransfer).not.toHaveBeenCalled();
  expect(oldIon).toBe(10_000_000_000n);
  expect(oldLion).toBe(2_000_000_000n);
  expect(await migrateLegacyIonDerivations('unlocked-token')).toEqual({});
});

it('keeps an unfinished address update for retry after UI rejection', async () => {
  acceptsUiCommit = false;
  expect(Object.keys(await migrateLegacyIonDerivations('unlocked-token'))).toEqual([accountId]);
  expect(records.ionDerivationMigrations[accountId].committed).toBeUndefined();
  acceptsUiCommit = true;
  await reconcileIonDerivationMigrations();
  expect(records.ionDerivationMigrations[accountId].committed).toBe(true);
  expect(submitGasfullTransfer).not.toHaveBeenCalled();
});

it('keeps recovery disabled when the backend flag is absent', async () => {
  await migrateLegacyIonDerivations('unlocked-token');
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({} as any);
  expect(await recoverLegacyIonFunds(accountId, 'unlocked-token')).toEqual({ error: 'Recovery is not enabled' });
  expect(submitGasfullTransfer).not.toHaveBeenCalled();
});

it('moves LION first, then the remaining native ION, only after a button action', async () => {
  await migrateLegacyIonDerivations('unlocked-token');
  jest.mocked(submitGasfullTransfer).mockImplementation((options) => {
    if (options.tokenAddress) {
      oldLion = 0n;
      newLion = 2_000_000_000n;
    } else {
      oldIon = 0n;
      newIon = 9_000_000_000n;
    }
    oldSeqno++;
    return Promise.resolve({ txId: `tx-${oldSeqno}` } as any);
  });

  expect(await recoverLegacyIonFunds(accountId, 'unlocked-token')).toEqual({ status: 'done' });
  expect(submitGasfullTransfer).toHaveBeenCalledTimes(2);
  expect(jest.mocked(submitGasfullTransfer).mock.calls[0][0]).toEqual(expect.objectContaining({
    sourceWallet: oldWallet, tokenAddress: LIQUID_JETTON, toAddress: newWallet.address,
  }));
  expect(jest.mocked(submitGasfullTransfer).mock.calls[1][0]).toEqual(expect.objectContaining({
    sourceWallet: oldWallet, amount: 10_000_000_000n, toAddress: newWallet.address,
  }));
  expect(await recoverLegacyIonFunds(accountId, 'unlocked-token')).toEqual({ status: 'done' });
  expect(submitGasfullTransfer).toHaveBeenCalledTimes(2);
});

it('waits for LION confirmation and never broadcasts the same transfer twice', async () => {
  await migrateLegacyIonDerivations('unlocked-token');
  jest.mocked(submitGasfullTransfer).mockResolvedValue({ txId: 'lion-pending' } as any);

  expect(await recoverLegacyIonFunds(accountId, 'unlocked-token')).toEqual({ status: 'pending' });
  expect(pause).toHaveBeenCalledTimes(30);
  expect(await recoverLegacyIonFunds(accountId, 'unlocked-token')).toEqual({ status: 'pending' });
  expect(submitGasfullTransfer).toHaveBeenCalledTimes(1);
  expect(records.ionDerivationMigrations[accountId].ion).toBeUndefined();
});
