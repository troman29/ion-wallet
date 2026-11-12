import type { ApiBridgeOperation } from '../../../types';

import { fetchStoredAccount } from '../../accounts';
import { callBackendGet } from '../../backend';
import { getBackendConfigCacheSync } from '../../cache';
import { fetchActiveBridgeOperations, fetchBridgeHistory } from './backend';
import { buildBridgeActivity } from './projection';

jest.mock('../../accounts', () => ({ fetchStoredAccount: jest.fn() }));
jest.mock('../../backend', () => ({ callBackendGet: jest.fn() }));
jest.mock('../../cache', () => ({ getBackendConfigCacheSync: jest.fn() }));

let accountNumber = 0;

function operation(overrides: Partial<ApiBridgeOperation> = {}): ApiBridgeOperation {
  return { id: 'one', revision: '1', network: 'mainnet', source: 'ton', fromAddress: 'sender',
    toAddress: 'recipient', amount: '100', receiveAmount: '90', timestamp: 1000, status: 'waiting',
    components: [], fees: [], ...overrides };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(fetchStoredAccount).mockResolvedValue({ byChain: { ton: { address: 'sender' } } } as never);
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({ isBridgeHistoryEnabled: true } as never);
  accountNumber++;
});

it('loads server operations without local transfer storage or the other chain wallet', async () => {
  jest.mocked(callBackendGet).mockResolvedValue({ items: [operation()], syncCursor: 'sync1',
    hasMore: false, isBackfilling: false });

  const result = await fetchBridgeHistory(`${accountNumber}-mainnet`);

  expect(result.activities[0].operation.id).toBe('one');
  expect(result.hasMore).toBe(false);
  expect(callBackendGet).toHaveBeenCalledWith('/bridge/operations', expect.objectContaining({ tonAddress: 'sender' }),
    undefined, undefined);
});

it('preserves verified cached projections during an outage and keeps unknown coverage open', async () => {
  jest.mocked(callBackendGet).mockRejectedValue(new Error('Offline'));
  const existing = buildBridgeActivity(operation({ status: 'completed' }));

  const result = await fetchBridgeHistory(`${accountNumber}-mainnet`, [existing]);

  expect(result.activities).toEqual([existing]);
  expect(result).toMatchObject({ hasMore: true, isAvailable: false });
});

it('falls back to raw history on a fresh outage without declaring the end', async () => {
  jest.mocked(callBackendGet).mockRejectedValue(new Error('Feature disabled'));

  expect(await fetchBridgeHistory(`${accountNumber}-mainnet`)).toMatchObject({
    activities: [], hasMore: true, isAvailable: false,
  });
});

it('does not treat an empty backfill page as an exhausted history', async () => {
  jest.mocked(callBackendGet).mockResolvedValue({
    items: [], syncCursor: 'sync1', hasMore: false, isBackfilling: true,
  });

  expect(await fetchBridgeHistory(`${accountNumber}-mainnet`)).toMatchObject({ activities: [], hasMore: true });
});

it('accepts rollback revisions and removals without resurrecting cached rows', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(100_000);
  const accountId = `${accountNumber}-mainnet`;
  jest.mocked(callBackendGet).mockResolvedValueOnce({ items: [operation({ status: 'completed' })],
    syncCursor: 'sync1', hasMore: false, isBackfilling: false });
  await fetchBridgeHistory(accountId);

  now.mockReturnValue(120_000);
  jest.mocked(callBackendGet).mockResolvedValueOnce({ items: [operation({ revision: '2', status: 'waiting' })],
    removedIds: [], nextCursor: 'sync2', hasMore: false, isBackfilling: false });
  expect((await fetchBridgeHistory(accountId)).activities[0].status).toBe('waiting');

  now.mockReturnValue(140_000);
  jest.mocked(callBackendGet).mockResolvedValueOnce({ items: [], removedIds: ['one'], nextCursor: 'sync3',
    hasMore: false, isBackfilling: false });
  const removed = await fetchBridgeHistory(accountId);
  expect(removed.removedIds).toEqual(['bridge:mainnet:one']);
  expect((await fetchBridgeHistory(accountId, [buildBridgeActivity(operation())])).activities).toEqual([]);
  now.mockRestore();
});

it('isolates changes cursors by account address and network', async () => {
  jest.mocked(callBackendGet).mockResolvedValueOnce({ items: [operation()], syncCursor: 'first',
    hasMore: false, isBackfilling: false }).mockResolvedValueOnce({ items: [], syncCursor: 'second',
    hasMore: false, isBackfilling: false });
  const accountId = `${accountNumber}-mainnet`;
  await fetchBridgeHistory(accountId);
  jest.mocked(fetchStoredAccount).mockResolvedValue({ byChain: { ton: { address: 'other' } } } as never);

  expect((await fetchBridgeHistory(accountId)).activities).toEqual([]);
  expect(jest.mocked(callBackendGet).mock.calls[1][0]).toBe('/bridge/operations');
});

it('advances server cursors through empty pages and older source timestamps', async () => {
  jest.mocked(callBackendGet).mockResolvedValueOnce({ items: [], nextCursor: 'older', syncCursor: 'sync1',
    hasMore: true, isBackfilling: false }).mockResolvedValueOnce({ items: [operation()], syncCursor: 'sync1',
    hasMore: false, isBackfilling: false });

  const result = await fetchBridgeHistory(`${accountNumber}-mainnet`, [], { throughTimestamp: 0 });

  expect(result.activities).toHaveLength(1);
  expect(jest.mocked(callBackendGet).mock.calls[1][1]).toMatchObject({ cursor: 'older' });
  expect(result.hasMore).toBe(false);
});

it('uses ordinary raw pagination when the backend does not advertise bridge history', async () => {
  jest.mocked(getBackendConfigCacheSync).mockReturnValue(undefined);

  expect(await fetchBridgeHistory(`${accountNumber}-mainnet`)).toMatchObject({ activities: [], hasMore: false });
  expect(callBackendGet).not.toHaveBeenCalled();
});

it('revalidates cached operations removed before this session changes cursor', async () => {
  jest.mocked(callBackendGet).mockResolvedValueOnce({ items: [], syncCursor: 'new-baseline',
    hasMore: false, isBackfilling: false })
    .mockRejectedValueOnce(Object.assign(new Error('Removed'), { statusCode: 404 }));

  const result = await fetchBridgeHistory(`${accountNumber}-mainnet`, [buildBridgeActivity(operation())]);

  expect(result.activities).toEqual([]);
  expect(result.removedIds).toEqual(['bridge:mainnet:one']);
});

it('restores old active operations independently of completed history pages', async () => {
  jest.mocked(callBackendGet).mockResolvedValue({ items: [operation({ timestamp: 1 })], syncCursor: 'sync1',
    hasMore: false, isBackfilling: false });

  expect(await fetchActiveBridgeOperations(`${accountNumber}-mainnet`)).toHaveLength(1);
  expect(jest.mocked(callBackendGet).mock.calls[0][0]).toBe('/bridge/operations/active');
});
