import './activities';

import type { ApiActivity, ApiBridgeOperation, ApiTransactionActivity, ApiUpdate } from '../../../api/types';
import type { GlobalState } from '../../types';

import { IONCOIN } from '../../../config';
import { callApi } from '../../../api';
import { buildBridgeActivity } from '../../../api/common/activities/bridge/projection';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { INITIAL_STATE } from '../../initialState';

jest.mock('../../../api', () => ({ callApi: jest.fn() }));
jest.mock('../../../util/notificationSound', () => ({ playIncomingTransactionSound: jest.fn() }));
jest.mock('../../index', () => ({
  addActionHandler: jest.fn(), getGlobal: jest.fn(), setGlobal: jest.fn(),
  getActions: jest.fn(() => ({ fetchPastActivities: jest.fn() })),
}));
jest.mock('../../selectors', () => ({
  ...jest.requireActual('../../selectors'), selectAccountTokens: () => [],
}));

const ACCOUNT_ID = '0-mainnet';
let store: GlobalState;

type ApiUpdateHandler = (global: GlobalState, actions: object, update: ApiUpdate) => Promise<void>;
const handler = jest.mocked(addActionHandler).mock.calls.find(([name]) => name === 'apiUpdate')![1] as ApiUpdateHandler;

function transaction(id: string, slug: string, timestamp: number): ApiTransactionActivity {
  return { id, kind: 'transaction', slug, timestamp, status: 'completed', amount: -100n, fee: 1n,
    fromAddress: 'sender', toAddress: 'bridge', normalizedAddress: 'sender', isIncoming: false,
    externalMsgHashNorm: id };
}

function reconciliation(
  upsert: ApiActivity[],
  replacedIds: Record<string, string> = {},
  evidenceActivities: ApiTransactionActivity[] = [],
) {
  return { confirmedActivities: upsert, pendingActivities: undefined, evidenceActivities, bridgeHasMore: false,
    patch: { upsert, evidenceActivities, replacedIds,
      removeIds: Object.keys(replacedIds).filter((id) => replacedIds[id] !== id) } };
}

async function initial(chain: 'ton' | 'bnb', activities: ApiTransactionActivity[], bySlug = {}) {
  jest.mocked(callApi).mockResolvedValueOnce(reconciliation(activities) as never);
  await handler(store, {}, { type: 'initialActivities', accountId: ACCOUNT_ID, chain,
    mainActivities: activities, bySlug, mainHistoryHasMore: true });
}

beforeEach(() => {
  store = { ...INITIAL_STATE, currentAccountId: ACCOUNT_ID,
    accounts: { byId: { [ACCOUNT_ID]: { title: 'Test', type: 'view',
      byChain: { ton: { address: 'sender' }, bnb: { address: 'bnb-owner' } } } } },
    byAccountId: { [ACCOUNT_ID]: {} } } as unknown as GlobalState;
  jest.mocked(callApi).mockReset();
  jest.mocked(getGlobal).mockImplementation(() => store);
  jest.mocked(setGlobal).mockImplementation((next) => {
    store = next;
  });
});

it('keeps initial raw rows behind the all-chain loading and pagination boundaries', async () => {
  const ton = transaction('ton', IONCOIN.slug, 1000);
  const tokenOnly = transaction('token-only', IONCOIN.slug, 500);
  jest.mocked(callApi).mockResolvedValueOnce(reconciliation([ton, tokenOnly]) as never);
  await handler(store, {}, { type: 'initialActivities', accountId: ACCOUNT_ID, chain: 'ton',
    mainActivities: [ton], bySlug: { [IONCOIN.slug]: [ton, tokenOnly] }, mainHistoryHasMore: true });

  expect(store.byAccountId[ACCOUNT_ID].activities?.idsMain).toBeUndefined();
  expect(store.byAccountId[ACCOUNT_ID].activities?.byId[tokenOnly.id]).toBeDefined();
  const bnb = transaction('bnb', 'bnb', 1200);
  await initial('bnb', [bnb]);

  expect(store.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual([bnb.id]);
  expect(store.byAccountId[ACCOUNT_ID].activities?.mainActivityIdsByChain?.ton).toEqual([ton.id]);
});

it('forwards swap and hydration evidence without reintroducing unrelated initial raw rows', async () => {
  const source = transaction('source', IONCOIN.slug, 1000);
  const unrelated = transaction('unrelated', IONCOIN.slug, 1500);
  const hash = 'ab'.repeat(32);
  const operation: ApiBridgeOperation = { id: 'one', revision: '1', network: 'mainnet', source: 'ton',
    fromAddress: 'sender', toAddress: 'recipient', amount: '100', receiveAmount: '90', timestamp: 999,
    status: 'waiting', fees: [], components: [{ role: 'source', chain: 'ton', hash, token: 'native',
      fromAddress: 'sender', toAddress: 'bridge', amount: '100' }] };
  const swap = buildBridgeActivity(operation);
  const evidence = { ...source, extra: { chainTransactionHashes: [hash] } };
  jest.mocked(callApi).mockResolvedValueOnce(reconciliation([unrelated, source, swap], {}, [evidence]) as never);
  await handler(store, {}, { type: 'initialActivities', accountId: ACCOUNT_ID, chain: 'ton',
    mainActivities: [unrelated, source], bySlug: {}, mainHistoryHasMore: true });

  expect(store.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual([swap.id]);
  expect(store.byAccountId[ACCOUNT_ID].activities?.byId[source.id]).toMatchObject({ shouldHide: true });
});

it('uses only incoming local replacements when adding confirmed rows after a new local event', async () => {
  const oldTon = transaction('old-ton', IONCOIN.slug, 1000);
  const bnb = transaction('bnb', 'bnb', 1200);
  await initial('ton', [oldTon]);
  await initial('bnb', [bnb]);
  const local: ApiTransactionActivity = { ...transaction('message:0:local', IONCOIN.slug, 5000),
    status: 'pendingTrusted' };
  const confirmed = transaction('confirmed-local', IONCOIN.slug, 5000);
  jest.mocked(callApi).mockResolvedValueOnce(reconciliation([oldTon, confirmed], {
    [oldTon.id]: oldTon.id, [local.id]: confirmed.id,
  }) as never);
  await handler(store, {}, { type: 'newLocalActivities', accountId: ACCOUNT_ID, activities: [local] });

  expect(store.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual([confirmed.id, bnb.id]);
});
