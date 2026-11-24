import { Address, TupleReader } from '@ton/core';
import { Wallet } from 'ethers';

import type { ApiBridgeOperation } from '../types';
import type { ApiBridgeTransfer } from '../types/bridge';

import { logDebugError } from '../../util/logs';
import { BRIDGE_CONFIG } from '../bridge/config';
import { BRIDGE_INTERFACE } from '../bridge/helpers';
import { saveTransfer } from '../bridge/store';
import { fetchPrivateKeyString, getSignerFromPrivateKey } from '../chains/evm/auth';
import { estimateEvmFee } from '../chains/evm/transfer';
import { getEvmProvider } from '../chains/evm/util/client';
import { checkTransactionDraft, submitGasfullTransfer } from '../chains/ton/transfer';
import { getTonClient } from '../chains/ton/util/tonCore';
import { fetchStoredAccount } from '../common/accounts';
import {
  fetchActiveBridgeOperations, fetchBridgeHistory, fetchBridgeOperation,
} from '../common/activities/bridge/backend';
import { buildBridgeActivity } from '../common/activities/bridge/projection';
import { getBackendConfigCacheSync } from '../common/cache';
import { getCurrentStorage, storage, withStorage } from '../storages';
import { claimBridge, getBridgeClaimFee, getBridgeQuote, getBridgeTransfers, submitBridge } from './bridge';

const mockContract = {
  balanceOf: jest.fn(),
  allowBurn: jest.fn(),
  getFullOracleSet: jest.fn(),
  finishedVotings: jest.fn(),
};

jest.mock('ethers', () => ({ ...jest.requireActual('ethers'), Contract: jest.fn(() => mockContract) }));
jest.mock('../chains/evm/auth');
jest.mock('../chains/evm/transfer', () => ({ estimateEvmFee: jest.fn() }));
jest.mock('../chains/evm/util/client', () => ({ getEvmProvider: jest.fn() }));
jest.mock('../chains/ton/transfer', () => ({ checkTransactionDraft: jest.fn(), submitGasfullTransfer: jest.fn() }));
jest.mock('../chains/ton/util/tonCore', () => ({ getTonClient: jest.fn() }));
jest.mock('../common/accounts', () => ({ fetchStoredAccount: jest.fn() }));
jest.mock('../common/cache', () => ({ getBackendConfigCacheSync: jest.fn() }));
jest.mock('../common/activities/bridge/backend', () => ({
  fetchBridgeHistory: jest.fn(), fetchActiveBridgeOperations: jest.fn(), fetchBridgeOperation: jest.fn(),
}));
jest.mock('../storages', () => {
  const { AsyncLocalStorage } = jest.requireActual('node:async_hooks');
  const context = new AsyncLocalStorage();
  const mockStorage = { getItem: jest.fn(), setItem: jest.fn() };

  return {
    storage: mockStorage,
    getCurrentStorage: () => context.getStore() ?? mockStorage,
    withStorage: (runtimeStorage: unknown, task: () => unknown) => context.run(runtimeStorage, task),
  };
});
jest.mock('./transfer', () => ({ createLocalTransactions: jest.fn() }));
jest.mock('../../util/logs', () => ({ logDebug: jest.fn(), logDebugError: jest.fn() }));

const TEST_KEY = `0x${'11'.repeat(32)}`;
const TEST_WALLET = new Wallet(TEST_KEY);
const TEST_ION_ADDRESS = new Address(0, Buffer.alloc(32, 1)).toString();
const TEST_ACCOUNT = {
  type: 'bip39',
  byChain: {
    ton: { address: TEST_ION_ADDRESS },
    bnb: { address: TEST_WALLET.address },
  },
};

let storedTransfers: ApiBridgeTransfer[];
let stateFlags: bigint;
let bnbBalance: bigint;

const mockTonClient = {
  runMethod: jest.fn(),
  getAddressInfo: jest.fn(),
  callRpc: jest.fn(),
  sendFile: jest.fn(),
};

const mockEvmProvider = {
  getBalance: jest.fn(),
  broadcastTransaction: jest.fn(),
  getTransactionReceipt: jest.fn(),
  getBlockNumber: jest.fn(),
  getTransaction: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();

  storedTransfers = [];
  stateFlags = 0n;
  bnbBalance = 10000n;

  jest.mocked(fetchStoredAccount).mockResolvedValue(TEST_ACCOUNT as never);
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({ isBridgeHistoryEnabled: true } as never);
  jest.mocked(fetchBridgeHistory).mockResolvedValue({
    activities: [], removedIds: [], hasMore: false, isAvailable: true, isBackfilling: false,
  });
  jest.mocked(fetchActiveBridgeOperations).mockResolvedValue([]);
  jest.mocked(fetchBridgeOperation).mockResolvedValue(undefined);
  jest.mocked(getTonClient).mockReturnValue(mockTonClient as never);
  jest.mocked(getEvmProvider).mockReturnValue(mockEvmProvider as never);

  mockTonClient.runMethod.mockImplementation((_address, method) => Promise.resolve({
    stack: new TupleReader((method === 'get_bridge_data'
      ? [stateFlags, 1000000000000n, 0n, 0n, 500000000n, 100000000n, 100n, 10000n]
      : method === 'seqno' ? [1n] : [-1n, 0n]).map((value) => ({ type: 'int', value }))),
  }));

  mockTonClient.getAddressInfo.mockResolvedValue({
    balance: '1000000000000',
    state: 'active',
    last_transaction_id: { lt: '100', hash: '' },
    block_id: { workchain: -1, shard: '-9223372036854775808', seqno: 1 },
  });

  mockTonClient.callRpc.mockImplementation((method) => {
    if (method === 'getBlockHeader') {
      return Promise.resolve({ gen_utime: Math.ceil(Date.now() / 1000) + 1 });
    }

    return Promise.resolve([]);
  });
  mockTonClient.sendFile.mockResolvedValue(undefined);

  mockContract.balanceOf.mockResolvedValue(1000000000000n);
  mockContract.allowBurn.mockResolvedValue(true);
  mockEvmProvider.getBalance.mockImplementation(() => Promise.resolve(bnbBalance));
  mockEvmProvider.getTransactionReceipt.mockResolvedValue(undefined);
  mockEvmProvider.getTransaction.mockResolvedValue(undefined);
  mockEvmProvider.getBlockNumber.mockResolvedValue(120);
  mockEvmProvider.broadcastTransaction.mockResolvedValue({ hash: 'hash' });

  jest.mocked(estimateEvmFee).mockResolvedValue(100n);
  jest.mocked(checkTransactionDraft).mockResolvedValue({ explainedFee: { fullFee: { nativeSum: 100n } } } as never);

  jest.mocked(submitGasfullTransfer).mockImplementation(async (options) => {
    await options.beforeBroadcast?.({
      boc: 'native-boc',
      msgHashNormalized: 'ion-hash',
      validUntil: Math.ceil(Date.now() / 1000) + 600,
      seqno: 1,
    });

    return { txId: 'ion-hash' };
  });

  jest.mocked(storage.getItem).mockImplementation(() => Promise.resolve(storedTransfers));
  jest.mocked(storage.setItem).mockImplementation((_key, value) => {
    storedTransfers = value;

    return Promise.resolve();
  });

  jest.mocked(fetchPrivateKeyString).mockResolvedValue(TEST_KEY);

  const signer = {
    address: TEST_WALLET.address,
    connect: () => signer,
    populateTransaction: (tx: object) => Promise.resolve({
      ...tx,
      chainId: 56,
      type: 0,
      gasLimit: 100n,
      gasPrice: 1n,
      nonce: 0,
    }),
    signTransaction: TEST_WALLET.signTransaction.bind(TEST_WALLET),
  };
  jest.mocked(getSignerFromPrivateKey).mockReturnValue(signer as never);
});

afterEach(() => jest.restoreAllMocks());

it.each(['ton', 'bnb'] as const)('quotes %s using contract fees and source network fees', async (source) => {
  const quote = await getBridgeQuote('0-mainnet', source, '100000000000');

  expect(quote.bridgeFee).toBe('1594000000');
  expect(quote.receiveAmount).toBe('98406000000');
  expect(quote.networkFee).toBe('120');
  expect(quote.maxAmount).toBe(source === 'ton' ? '999999999880' : '1000000000000');
});

it('rejects paused routes, insufficient native gas, and read-only accounts', async () => {
  stateFlags = 1n;

  await expect(getBridgeQuote('0-mainnet', 'ton', '100000000000')).rejects.toThrow('temporarily');

  stateFlags = 0n;
  bnbBalance = 0n;

  await expect(getBridgeQuote('0-mainnet', 'bnb', '100000000000')).rejects.toThrow('BNB');

  jest.mocked(fetchStoredAccount).mockResolvedValue({ ...TEST_ACCOUNT, type: 'view' } as never);

  await expect(getBridgeQuote('0-mainnet', 'ton', '100000000000')).rejects.toThrow('same account');
});

it('does not sign expired quotes or a quote with a different recipient', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');

  await expect(submitBridge({ ...quote, expiresAt: 0 }, 'auth')).rejects.toThrow('expired');
  await expect(submitBridge({ ...quote, toAddress: `0x${'22'.repeat(20)}` }, 'auth')).rejects.toThrow('changed');
  expect(submitGasfullTransfer).not.toHaveBeenCalled();
  expect(fetchPrivateKeyString).not.toHaveBeenCalled();
});

it.each(['ton', 'bnb'] as const)('accepts a fee increase inside the approved %s limit', async (source) => {
  const quote = await getBridgeQuote('0-mainnet', source, '100000000000');
  jest.mocked(checkTransactionDraft).mockResolvedValue({ explainedFee: { fullFee: { nativeSum: 110n } } } as never);
  jest.mocked(estimateEvmFee).mockResolvedValue(110n);

  const transfer = await submitBridge(quote, 'auth');

  expect(transfer.networkFee).toBe('120');
  expect(transfer.status).toBe('pending');
  expect(source === 'ton' ? submitGasfullTransfer : fetchPrivateKeyString).toHaveBeenCalledTimes(1);
});

it.each(['ton', 'bnb'] as const)('does not sign when the %s fee exceeds the approved limit', async (source) => {
  const quote = await getBridgeQuote('0-mainnet', source, '100000000000');
  jest.mocked(checkTransactionDraft).mockResolvedValue({ explainedFee: { fullFee: { nativeSum: 121n } } } as never);
  jest.mocked(estimateEvmFee).mockResolvedValue(121n);

  await expect(submitBridge(quote, 'auth')).rejects.toThrow('The quote changed');
  expect(submitGasfullTransfer).not.toHaveBeenCalled();
  expect(fetchPrivateKeyString).not.toHaveBeenCalled();
  expect(storedTransfers).toHaveLength(0);
});

it('keeps Max available when the native fee grows inside the reserved headroom', async () => {
  const balance = await getBridgeQuote('0-mainnet', 'ton', '0');
  const quote = await getBridgeQuote('0-mainnet', 'ton', balance.maxAmount);
  jest.mocked(checkTransactionDraft).mockResolvedValue({ explainedFee: { fullFee: { nativeSum: 110n } } } as never);

  await submitBridge(quote, 'auth');

  expect(submitGasfullTransfer).toHaveBeenCalledWith(expect.objectContaining({
    amount: BigInt(balance.maxAmount),
    fee: BigInt(quote.networkFee),
  }));
});

it('persists the signed native message before broadcasting and serializes concurrent submissions', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  jest.mocked(submitGasfullTransfer).mockImplementation(async (options) => {
    expect(storedTransfers).toHaveLength(0);

    await options.beforeBroadcast!({
      boc: 'native-boc',
      msgHashNormalized: 'ion-hash',
      validUntil: Date.now() / 1000 + 600,
      seqno: 1,
    });

    expect(storedTransfers).toHaveLength(1);
    expect(storedTransfers[0].startLt).toBe('100');
    expect(storedTransfers[0].nativeSubmission?.boc).toBe('native-boc');

    return { txId: 'ion-hash' };
  });

  const [first, second] = await Promise.all([submitBridge(quote, 'auth'), submitBridge(quote, 'auth')]);

  expect(first.id).toBe(second.id);
  expect(submitGasfullTransfer).toHaveBeenCalledTimes(1);
  expect(storedTransfers[0].txId).toBe('ion-hash');
});

it('does not leave a blocking intent when interrupted before signing', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  jest.mocked(submitGasfullTransfer).mockRejectedValueOnce(new Error('Interrupted before signing'));

  await expect(submitBridge(quote, 'auth')).rejects.toThrow('Interrupted');
  expect(storedTransfers).toHaveLength(0);
  expect((await submitBridge(quote, 'auth')).txId).toBe('ion-hash');
});

it('recovers the identical native message after interruption without another signature', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  jest.mocked(submitGasfullTransfer).mockImplementationOnce(async (options) => {
    await options.beforeBroadcast!({
      boc: 'native-boc',
      msgHashNormalized: 'ion-hash',
      validUntil: Date.now() / 1000 + 600,
      seqno: 1,
    });

    return { error: 'ServerError' };
  });

  const pending = await submitBridge(quote, 'auth');
  await getBridgeTransfers('0-mainnet', true);

  expect(mockTonClient.sendFile).toHaveBeenCalledWith('native-boc');
  expect((await submitBridge(quote, 'auth')).id).toBe(pending.id);
  expect(submitGasfullTransfer).toHaveBeenCalledTimes(1);
});

it('retires a legacy unsent intent only after expiry on chain and a complete sender scan', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  storedTransfers = [{
    ...quote,
    id: 'legacy',
    createdAt: Date.now(),
    status: 'pending',
    startLt: '100',
  }];

  const [first] = await getBridgeTransfers('0-mainnet', true);

  expect(first.status).toBe('pending');

  const afterExpiry = (first.nativeRecovery!.validUntil + 1) * 1000;
  jest.spyOn(Date, 'now').mockReturnValue(afterExpiry);

  const [expired] = await getBridgeTransfers('0-mainnet', true);

  expect(expired.status).toBe('failed');
  expect(mockTonClient.sendFile).not.toHaveBeenCalled();

  const fresh = await getBridgeQuote('0-mainnet', 'ton', '100000000000');

  expect((await submitBridge(fresh, 'auth')).id).not.toBe('legacy');
});

it('keeps an expired send pending if the wallet already sent its bridge message', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  storedTransfers = [{
    ...quote,
    id: 'sent',
    createdAt: Date.now() - 700000,
    status: 'pending',
    startLt: '100',
    nativeSubmission: { boc: 'expired-boc', validUntil: Date.now() / 1000 - 1 },
  }];
  mockTonClient.callRpc.mockImplementation((method, params) => {
    if (method === 'getBlockHeader') {
      return Promise.resolve({ gen_utime: Math.ceil(Date.now() / 1000) + 1 });
    }

    if (params.address === TEST_ION_ADDRESS) {
      return Promise.resolve([{
        utime: Date.now() / 1000,
        out_msgs: [{
          destination: BRIDGE_CONFIG.mainnet.bridge,
          value: quote.amount,
          message: `swapTo#${TEST_WALLET.address}`,
        }],
      }]);
    }

    return Promise.resolve([]);
  });

  const [transfer] = await getBridgeTransfers('0-mainnet', true);

  expect(transfer.status).toBe('pending');
  expect(transfer.nativeRecovery?.sourceConfirmed).toBe(true);
  expect(mockTonClient.sendFile).not.toHaveBeenCalled();
});

it('uses sender logical time to recover a send created with an incorrect phone clock', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  storedTransfers = [{
    ...quote,
    id: 'sent',
    createdAt: Date.now() + 86400000,
    status: 'pending',
    nativeStartLt: '100',
    nativeSubmission: { boc: 'boc', validUntil: Date.now() / 1000 - 1, seqno: 1 },
  }];
  mockTonClient.callRpc.mockImplementation((method, params) => {
    if (method === 'getBlockHeader') {
      return Promise.resolve({ gen_utime: Date.now() / 1000 + 1 });
    }

    if (params.address === TEST_ION_ADDRESS) {
      return Promise.resolve([{
        transaction_id: { lt: '101', hash: 'hash' },
        out_msgs: [{
          destination: BRIDGE_CONFIG.mainnet.bridge,
          value: quote.amount,
          message: `swapTo#${TEST_WALLET.address}`,
        }],
      }]);
    }

    return Promise.resolve([]);
  });

  const [transfer] = await getBridgeTransfers('0-mainnet', true);

  expect(transfer.status).toBe('pending');
  expect(transfer.nativeRecovery?.sourceConfirmed).toBe(true);
});

it('retains the EVM hash when broadcasting times out and prevents a second burn', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'bnb', '100000000000');
  const cause = new Error('Network timeout');
  mockEvmProvider.broadcastTransaction.mockImplementation(() => {
    expect(storedTransfers[0].txId).toMatch(/^0x[0-9a-f]{64}$/);

    return Promise.reject(cause);
  });

  const pending = await submitBridge(quote, 'auth');

  expect(pending.status).toBe('pending');
  expect(pending.error).toContain('Submission');
  expect(logDebugError).toHaveBeenCalledWith('bridge.broadcastEvmTransfer', cause, {
    transferId: pending.id,
    isClaim: false,
  });
  expect((await submitBridge(quote, 'auth')).id).toBe(pending.id);
  expect(mockEvmProvider.broadcastTransaction).toHaveBeenCalledTimes(1);

  await getBridgeTransfers('0-mainnet', true);

  expect(mockEvmProvider.broadcastTransaction.mock.calls[1][0])
    .toBe(mockEvmProvider.broadcastTransaction.mock.calls[0][0]);
  expect(fetchPrivateKeyString).toHaveBeenCalledTimes(1);
});

it('keeps pending progress and logs the original error when a status RPC fails', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'bnb', '100000000000');
  const cause = new Error('RPC offline');
  storedTransfers = [{
    ...quote,
    id: 'pending',
    createdAt: 1,
    status: 'pending',
    txId: 'hash',
  }];
  mockEvmProvider.getTransactionReceipt.mockRejectedValueOnce(cause);

  const [transfer] = await getBridgeTransfers('0-mainnet', true);

  expect(transfer.status).toBe('pending');
  expect(storedTransfers[0].error).toBeUndefined();
  expect(transfer.error).toContain('Unable to refresh');
  expect(logDebugError).toHaveBeenCalledWith('bridge.refreshTransfer', cause, {
    transferId: 'pending',
    source: 'bnb',
  });
});

it('does not retire a send when the phone clock is ahead of chain time', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  const validUntil = Date.now() / 1000 - 1;
  storedTransfers = [{
    ...quote,
    id: 'pending',
    createdAt: Date.now() - 700000,
    status: 'pending',
    nativeSubmission: { boc: 'boc', validUntil, seqno: 1 },
  }];
  mockTonClient.callRpc.mockImplementation((method) => {
    if (method === 'getBlockHeader') {
      return Promise.resolve({ gen_utime: validUntil - 100 });
    }

    return Promise.resolve([]);
  });

  expect((await getBridgeTransfers('0-mainnet', true))[0].status).toBe('pending');
});

it('scans all sender pages before retiring an expired signed message', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  storedTransfers = [{
    ...quote,
    id: 'pending',
    createdAt: Date.now() - 700000,
    status: 'pending',
    nativeSubmission: { boc: 'boc', validUntil: Date.now() / 1000 - 1, seqno: 1 },
  }];
  mockTonClient.callRpc.mockImplementation((method, params) => {
    if (method === 'getBlockHeader') {
      return Promise.resolve({ gen_utime: Date.now() / 1000 + 1 });
    }

    if (params.address !== TEST_ION_ADDRESS) {
      return Promise.resolve([]);
    }

    if (!params.lt) {
      return Promise.resolve(Array.from({ length: 50 }, (_, index) => ({
        utime: Date.now() / 1000,
        transaction_id: { lt: String(1000 - index), hash: 'hash' },
        out_msgs: [],
      })));
    }

    return Promise.resolve([{
      utime: Date.now() / 1000 - 500,
      out_msgs: [{
        destination: BRIDGE_CONFIG.mainnet.bridge,
        value: quote.amount,
        message: `swapTo#${TEST_WALLET.address}`,
      }],
    }]);
  });

  const [first] = await getBridgeTransfers('0-mainnet', true);

  expect(first.status).toBe('pending');
  expect(first.nativeRecovery?.scanLt).toBe('951');

  const [second] = await getBridgeTransfers('0-mainnet', true);

  expect(second.status).toBe('pending');
  expect(second.nativeRecovery?.sourceConfirmed).toBe(true);
});

it('recovers an unexpired first wallet message and retires it only after its sequence is consumed', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  storedTransfers = [{
    ...quote,
    id: 'first',
    createdAt: Date.now(),
    status: 'pending',
    nativeSubmission: { boc: 'first-boc', validUntil: 0xffffffff, seqno: 0 },
  }];
  const implementation = mockTonClient.runMethod.getMockImplementation()!;
  mockTonClient.runMethod.mockImplementation((address, method) => method === 'seqno'
    ? Promise.resolve({ stack: new TupleReader([{ type: 'int', value: 0n }]) })
    : implementation(address, method));

  expect((await getBridgeTransfers('0-mainnet', true))[0].status).toBe('pending');
  expect(mockTonClient.sendFile).toHaveBeenCalledWith('first-boc');

  mockTonClient.runMethod.mockImplementation(implementation);

  expect((await getBridgeTransfers('0-mainnet', true))[0].status).toBe('failed');
});

it('does not report completion from an expired/processed oracle query without a payout', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'bnb', '100000000000');
  storedTransfers = [{
    ...quote,
    id: 'pending',
    createdAt: 1,
    status: 'waiting',
    txId: `0x${'33'.repeat(32)}`,
    queryId: '1234',
    logIndex: 64,
    startLt: '100',
  }];
  mockEvmProvider.getTransactionReceipt.mockResolvedValue({ status: 1, blockNumber: 100 });

  const [transfer] = await getBridgeTransfers('0-mainnet', true);

  expect(transfer.status).toBe('waiting');
  expect(mockTonClient.callRpc).toHaveBeenCalledWith(
    'getTransactions', expect.objectContaining({ address: TEST_ION_ADDRESS }),
  );
});

it('keeps mainnet and testnet token contracts separate', async () => {
  await getBridgeQuote('0-testnet', 'bnb', '100000000000');

  expect(estimateEvmFee).toHaveBeenCalledWith(
    mockEvmProvider, expect.objectContaining({ to: BRIDGE_CONFIG.testnet.token }),
  );
});

it('keeps queued transfer history isolated between runtime profiles', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  const profileA = { ...storage };
  const profileB = { ...storage };
  jest.mocked(storage.getItem).mockImplementation(() => Promise.resolve([{
    ...quote,
    id: getCurrentStorage() === profileA ? 'profile-a' : 'profile-b',
    createdAt: 1,
    status: 'completed',
  }]));

  const [first, second] = await Promise.all([
    withStorage(profileA, () => getBridgeTransfers('0-mainnet')),
    withStorage(profileB, () => getBridgeTransfers('0-mainnet')),
  ]);

  expect(first[0].id).toBe('profile-a');
  expect(second[0].id).toBe('profile-b');
});

it.each([false, true])('claims once with sorted signatures (initial oracle set empty: %s)', async (isTransient) => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  storedTransfers = [{
    ...quote,
    id: 'claim',
    createdAt: 1,
    status: 'waiting',
    swapId: `0x${'55'.repeat(32)}`,
    swapData: {
      receiver: TEST_WALLET.address,
      amount: quote.receiveAmount,
      tx: {
        address_: { workchain: 0, address_hash: `0x${'01'.repeat(32)}` },
        tx_hash: `0x${'33'.repeat(32)}`,
        lt: '90071992547409939',
      },
    },
  }];
  const oracles = [1, 2, 3].map((value) => `0x${String(value).repeat(40)}`);
  mockContract.getFullOracleSet.mockResolvedValue(oracles);
  if (isTransient) {
    mockContract.getFullOracleSet.mockResolvedValueOnce([]);
  }
  mockContract.finishedVotings.mockResolvedValue(false);
  mockTonClient.callRpc.mockResolvedValue({
    exit_code: 0,
    stack: [['tuple', {
      elements: [
        buildOracleSignature(oracles[1]),
        buildOracleSignature(oracles[0]),
        buildOracleSignature(oracles[1]),
        buildOracleSignature(`0x${'99'.repeat(20)}`),
      ],
    }]],
  });

  expect(await getBridgeClaimFee('0-mainnet', 'claim')).toBe('120');

  const request = jest.mocked(estimateEvmFee).mock.calls.at(-1)![1];
  const decoded = BRIDGE_INTERFACE.decodeFunctionData('voteForMinting', request.data!);

  expect(decoded.signatures.map((signature: { signer: string }) => signature.signer.toLowerCase()))
    .toEqual([oracles[0], oracles[1]]);

  const result = await claimBridge('0-mainnet', 'claim', '120', 'auth');

  expect(result.status).toBe('claiming');
  expect(result.networkFee).toBe(quote.networkFee);
  expect(result.claimNetworkFee).toBe('120');
  await expect(claimBridge('0-mainnet', 'claim', '120', 'auth')).rejects.toThrow('not ready');
  expect(fetchPrivateKeyString).toHaveBeenCalledTimes(1);
});

function buildOracleSignature(signer: string) {
  return {
    tuple: {
      elements: [
        { number: { number: BigInt(signer).toString() } },
        { tuple: { elements: [1, 2, 27].map((number) => ({ number: { number: String(number) } })) } },
      ],
    },
  };
}

it('restores an ION to BNB operation as claimable from server evidence on another device', async () => {
  const operation: ApiBridgeOperation = {
    id: 'server-operation', revision: '1', network: 'mainnet', source: 'ton', fromAddress: TEST_ION_ADDRESS,
    toAddress: TEST_WALLET.address, amount: '100000000000', receiveAmount: '98000000000', timestamp: 1000,
    status: 'waiting', swapId: `0x${'55'.repeat(32)}`, components: [], fees: [],
    swapData: { receiver: TEST_WALLET.address, amount: '98000000000', tx: {
      address_: { workchain: 0, address_hash: `0x${'01'.repeat(32)}` }, tx_hash: `0x${'33'.repeat(32)}`, lt: '1',
    } },
  };
  const oracles = [1, 2, 3].map((value) => `0x${String(value).repeat(40)}`);
  mockContract.getFullOracleSet.mockResolvedValue(oracles);
  mockContract.finishedVotings.mockResolvedValue(false);
  mockTonClient.callRpc.mockResolvedValue({ exit_code: 0, stack: [['tuple', {
    elements: [buildOracleSignature(oracles[0]), buildOracleSignature(oracles[1])],
  }]] });
  jest.mocked(fetchBridgeHistory).mockResolvedValue({ activities: [buildBridgeActivity(operation)],
    removedIds: [], hasMore: false, isAvailable: true, isBackfilling: false });

  const [transfer] = await getBridgeTransfers('0-mainnet', true);

  expect(transfer).toMatchObject({ id: 'bridge:mainnet:server-operation', status: 'claimable',
    serverOperationId: 'server-operation', votes: 2, requiredVotes: 2 });
  expect(fetchPrivateKeyString).not.toHaveBeenCalled();
  expect(submitGasfullTransfer).not.toHaveBeenCalled();

  mockContract.finishedVotings.mockResolvedValue(true);
  expect((await getBridgeTransfers('0-mainnet', true))[0].status).toBe('waiting');
  jest.mocked(fetchBridgeHistory).mockResolvedValue({ activities: [buildBridgeActivity({ ...operation,
    status: 'completed', revision: '2' })], removedIds: [], hasMore: false, isAvailable: true, isBackfilling: false });
  expect((await getBridgeTransfers('0-mainnet', true))[0].status).toBe('completed');
});

it('loads a selected old operation directly when the initial history and active pages omit it', async () => {
  const operation: ApiBridgeOperation = { id: 'bridge:mainnet:ton:token:old', revision: '1', network: 'mainnet',
    source: 'ton', fromAddress: TEST_ION_ADDRESS, toAddress: TEST_WALLET.address, amount: '100', receiveAmount: '90',
    timestamp: 1, status: 'waiting', components: [], fees: [] };
  jest.mocked(fetchBridgeOperation).mockResolvedValue(operation);

  const [transfer] = await getBridgeTransfers('0-mainnet', false, operation.id);

  expect(transfer.serverOperationId).toBe(operation.id);
  expect(fetchBridgeOperation).toHaveBeenCalledWith('0-mainnet', operation.id);
});

it('keeps signing recovery records separate when two accounts share the canonical operation id', async () => {
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  const first: ApiBridgeTransfer = { ...quote, id: 'shared-operation', createdAt: 1, status: 'claiming',
    signedEvmTransaction: 'recipient-signed' };
  storedTransfers = [first];
  await saveTransfer({ ...first, accountId: '1-mainnet', signedEvmTransaction: undefined });

  expect(storedTransfers).toHaveLength(2);
  expect(storedTransfers.find(({ accountId }) => accountId === '0-mainnet')?.signedEvmTransaction)
    .toBe('recipient-signed');
});

it('preserves local bridge completion when server history capability is disabled', async () => {
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({ isBridgeHistoryEnabled: false } as never);
  const quote = await getBridgeQuote('0-mainnet', 'ton', '100000000000');
  storedTransfers = [{ ...quote, id: 'legacy-claim', createdAt: 1, status: 'claiming',
    swapId: `0x${'55'.repeat(32)}`, claimTxId: `0x${'77'.repeat(32)}`,
    swapData: { receiver: TEST_WALLET.address, amount: quote.receiveAmount, tx: {
      address_: { workchain: 0, address_hash: `0x${'01'.repeat(32)}` },
      tx_hash: `0x${'33'.repeat(32)}`, lt: '123',
    } } }];
  mockContract.finishedVotings.mockResolvedValue(true);

  expect((await getBridgeTransfers('0-mainnet', true))[0].status).toBe('completed');
  expect(storedTransfers[0].status).toBe('completed');
});
