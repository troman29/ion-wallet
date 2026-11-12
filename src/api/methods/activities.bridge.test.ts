import type { ApiBridgeOperation, ApiTransactionActivity } from '../types';

import { ION_BNB_MAINNET, IONCOIN } from '../../config';
import chains from '../chains';
import { getTokenActivitySlice } from '../chains/evm/activities';
import { fetchStoredAccount } from '../common/accounts';
import { fetchBridgeActivityDetails, fetchBridgeHistory } from '../common/activities/bridge/backend';
import { buildBridgeActivity, projectBridgeActivities } from '../common/activities/bridge/projection';
import { fetchActivityDetails, fetchPastActivities, reconcileActivityUpdate } from './activities';

jest.mock('../common/accounts', () => ({ fetchStoredAccount: jest.fn() }));
jest.mock('../common/activities/bridge/backend', () => ({
  fetchBridgeHistory: jest.fn(), fetchBridgeActivityDetails: jest.fn(),
}));
jest.mock('../chains/evm/activities', () => ({ getTokenActivitySlice: jest.fn() }));
jest.mock('../chains', () => ({ __esModule: true, default: {
  ton: { fetchActivitySlice: jest.fn(), fetchActivityDetails: jest.fn() },
  bnb: { fetchActivitySlice: jest.fn(), fetchActivityDetails: jest.fn() },
} }));

function operation(overrides: Partial<ApiBridgeOperation> = {}): ApiBridgeOperation {
  return { id: 'one', revision: '2', network: 'mainnet', source: 'ton', fromAddress: 'from', toAddress: 'to',
    amount: '100', receiveAmount: '90', timestamp: 100, status: 'waiting', components: [], fees: [], ...overrides };
}

function transaction(): ApiTransactionActivity {
  return { id: 'trace:action', kind: 'transaction', timestamp: 1000, slug: IONCOIN.slug, amount: -100n,
    fromAddress: 'from', toAddress: 'bridge', normalizedAddress: 'from', fee: 1n, isIncoming: false,
    status: 'completed' };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(fetchStoredAccount).mockResolvedValue({ byChain: { ton: { address: 'from' } } } as never);
  jest.mocked(chains.ton.fetchActivitySlice).mockResolvedValue([transaction()]);
  jest.mocked(fetchBridgeHistory).mockResolvedValue({ activities: [buildBridgeActivity(operation())],
    removedIds: [], hasMore: false, isAvailable: true, isBackfilling: false });
});

it('keeps the raw continuation when a bridge operation is older than its destination component', async () => {
  const result = await fetchPastActivities('1-mainnet', 50);

  expect(result?.continuationTimestamp).toBe(1000);
  expect(result?.activities.map(({ kind }) => kind)).toEqual(['transaction', 'swap']);
  expect(fetchBridgeHistory).toHaveBeenCalledWith('1-mainnet', [], expect.objectContaining({ throughTimestamp: 1000 }));
});

it('queries the bridge overlay for token-filtered pages on either side', async () => {
  jest.mocked(fetchStoredAccount).mockResolvedValue({ byChain: { bnb: { address: 'to' } } } as never);
  jest.mocked(getTokenActivitySlice).mockResolvedValue({ activities: [], hasMore: false, isBackfilling: true });
  const result = await fetchPastActivities('1-mainnet', 50, ION_BNB_MAINNET.slug);

  expect(fetchBridgeHistory).toHaveBeenCalledWith('1-mainnet', [], expect.objectContaining({
    tokenSlug: ION_BNB_MAINNET.slug,
  }));
  expect(result?.hasMore).toBe(true);
});

it('keeps pagination open when the BNB backend is still backfilling an empty page', async () => {
  jest.mocked(fetchStoredAccount).mockResolvedValue({ byChain: { bnb: { address: 'to' } } } as never);
  jest.mocked(getTokenActivitySlice).mockResolvedValue({ activities: [], hasMore: false, isBackfilling: true });
  jest.mocked(fetchBridgeHistory).mockResolvedValue({ activities: [], removedIds: [], hasMore: false,
    isAvailable: true, isBackfilling: false });

  expect(await fetchPastActivities('1-mainnet', 50)).toMatchObject({ activities: [], hasMore: true });
});

it('does not apply transaction terminal status ranking to a server operation revision', async () => {
  const previous = buildBridgeActivity(operation({ status: 'completed', revision: '1' }));
  const result = await reconcileActivityUpdate('1-mainnet', [previous], []);

  expect(result.confirmedActivities[0]).toMatchObject({ kind: 'swap', status: 'waiting' });
});

it('loads server operation details without requiring the source chain wallet', async () => {
  const swap = buildBridgeActivity(operation());
  jest.mocked(fetchBridgeActivityDetails).mockResolvedValue(swap);

  expect(await fetchActivityDetails('1-mainnet', swap)).toBe(swap);
  expect(chains.ton.fetchActivityDetails).not.toHaveBeenCalled();
});

it('holds raw pagination at the actual bridge coverage frontier', async () => {
  jest.mocked(fetchBridgeHistory).mockResolvedValue({ activities: [buildBridgeActivity(operation())],
    removedIds: [], hasMore: true, isAvailable: true, isBackfilling: false, coverageTimestamp: 1500 });

  expect((await fetchPastActivities('1-mainnet', 50))?.continuationTimestamp).toBe(1500);
});

it('converges legacy cached TON rows to one operation after exact detail hydration', async () => {
  const hash = 'ab'.repeat(32);
  const cached = { ...transaction(), externalMsgHashNorm: 'normalized-message' };
  const swap = buildBridgeActivity(operation({ components: [{ role: 'source', chain: 'ton', hash,
    fromAddress: 'from', toAddress: 'bridge', amount: '100', token: 'native' }] }));
  jest.mocked(fetchBridgeHistory).mockResolvedValue({ activities: [swap], removedIds: [], hasMore: false,
    isAvailable: true, isBackfilling: false });
  jest.mocked(chains.ton.fetchActivityDetails).mockResolvedValue({
    ...cached, fee: 999n, extra: { chainTransactionHashes: [hash] },
  });

  const result = await reconcileActivityUpdate('2-mainnet', [cached], []);
  const projection = projectBridgeActivities([...result.patch.upsert, ...result.patch.evidenceActivities]);

  expect(chains.ton.fetchActivityDetails).toHaveBeenCalledWith('2-mainnet', cached, undefined);
  expect(projection.activities.filter(({ shouldHide }) => !shouldHide)).toEqual([swap]);
  expect(projection.activities.find(({ id }) => id === cached.id)).toMatchObject({ fee: 1n, shouldHide: true });
});

it('does not let direct matches in cached confirmed context consume a local alias replacement', async () => {
  const confirmed = { ...transaction(), externalMsgHashNorm: 'one-message' };
  const local: ApiTransactionActivity = { ...confirmed, id: 'one-message:0:local', status: 'pendingTrusted' };

  const result = await reconcileActivityUpdate('3-mainnet', [confirmed, local], [confirmed]);

  expect(result.patch.replacedIds[local.id]).toBe(confirmed.id);
  expect(result.patch.replacedIds[confirmed.id]).toBeUndefined();
  expect(result.patch.removeIds).toContain(local.id);
});
