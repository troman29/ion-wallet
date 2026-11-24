import type { ApiBridgeOperation, ApiTransactionActivity } from '../../api/types';
import type { GlobalState } from '../types';

import { ION_BNB_MAINNET, IONCOIN } from '../../config';
import { buildBridgeActivity } from '../../api/common/activities/bridge/projection';
import { INITIAL_STATE } from '../initialState';
import { selectLastActivityTimestamp } from '../selectors/activities';
import { addNewActivities, addPastActivities, applyActivitiesPatch, updateActivity } from './activities';

const ACCOUNT_ID = '1-mainnet';
const HASH = 'ab'.repeat(32);

function globalState(): GlobalState {
  return { ...INITIAL_STATE, currentAccountId: ACCOUNT_ID,
    accounts: { byId: { [ACCOUNT_ID]: { title: 'Test', type: 'view', byChain: { ton: { address: 'from' } } } } },
    byAccountId: { [ACCOUNT_ID]: {} } } as unknown as GlobalState;
}

function operation(overrides: Partial<ApiBridgeOperation> = {}): ApiBridgeOperation {
  return { id: 'one', revision: '1', network: 'mainnet', source: 'ton', fromAddress: 'from', toAddress: 'recipient',
    amount: '100', receiveAmount: '90', timestamp: 1000, status: 'waiting', fees: [],
    components: [{ role: 'source', chain: 'ton', hash: HASH, fromAddress: 'from', toAddress: 'bridge',
      amount: '100', token: 'native' }], ...overrides };
}

function rawTransaction(): ApiTransactionActivity {
  return { id: 'trace:action', kind: 'transaction', timestamp: 1001, slug: IONCOIN.slug, amount: -100n,
    fromAddress: 'from', toAddress: 'bridge', normalizedAddress: 'from', fee: 1n, isIncoming: false,
    status: 'completed', extra: { chainTransactionHashes: [HASH] } };
}

it('folds cached raw rows on a second device, keeps details, and indexes both token feeds', () => {
  const swap = buildBridgeActivity(operation());
  let global = addPastActivities(globalState(), ACCOUNT_ID, IONCOIN.slug, [rawTransaction()]);
  global = addNewActivities(global, ACCOUNT_ID, [swap]);
  const activities = global.byAccountId[ACCOUNT_ID].activities!;

  expect(activities.idsMain).toEqual([swap.id]);
  expect(activities.idsBySlug?.[IONCOIN.slug]).toEqual([swap.id]);
  expect(activities.idsBySlug?.[ION_BNB_MAINNET.slug]).toEqual([swap.id]);
  expect(activities.byId['trace:action']).toMatchObject({ shouldHide: true });
});

it('applies projection equally when raw token history arrives after the operation', () => {
  const swap = buildBridgeActivity(operation());
  let global = addNewActivities(globalState(), ACCOUNT_ID, [swap]);
  global = addPastActivities(global, ACCOUNT_ID, IONCOIN.slug, [rawTransaction()], false, 1001);

  expect(global.byAccountId[ACCOUNT_ID].activities?.idsBySlug?.[IONCOIN.slug]).toEqual([swap.id]);
  expect(selectLastActivityTimestamp(global, ACCOUNT_ID, IONCOIN.slug)).toBe(1001);
});

it('reveals retained raw components when changes remove the operation', () => {
  const swap = buildBridgeActivity(operation());
  let global = addNewActivities(globalState(), ACCOUNT_ID, [rawTransaction(), swap]);
  global = applyActivitiesPatch(global, ACCOUNT_ID, { upsert: [], removeIds: [swap.id] });
  const activities = global.byAccountId[ACCOUNT_ID].activities!;

  expect(activities.idsMain).toEqual(['trace:action']);
  expect(activities.idsBySlug?.[IONCOIN.slug]).toEqual(['trace:action']);
  expect(activities.byId['trace:action'].shouldHide).toBeUndefined();
});

it('accepts later server status revisions after completion and ignores older pages', () => {
  const completed = buildBridgeActivity(operation({ status: 'completed', revision: '2' }));
  let global = addNewActivities(globalState(), ACCOUNT_ID, [completed]);
  const rollback = buildBridgeActivity(operation({ status: 'waiting', revision: '3' }));
  global = applyActivitiesPatch(global, ACCOUNT_ID, { upsert: [rollback], removeIds: [] });
  global = addPastActivities(global, ACCOUNT_ID, undefined, [completed]);

  expect(global.byAccountId[ACCOUNT_ID].activities?.byId[rollback.id]).toEqual(rollback);
  global = updateActivity(global, ACCOUNT_ID, completed);
  expect(global.byAccountId[ACCOUNT_ID].activities?.byId[rollback.id]).toEqual(rollback);
});

it('merges hydrated evidence into current details without overwriting newer fee, status or metadata', () => {
  const current: ApiTransactionActivity = { ...rawTransaction(), externalMsgHashNorm: 'message', fee: 42n,
    status: 'failed', extra: { queryId: 'newer-detail' } };
  const evidence: ApiTransactionActivity = { ...current, fee: 1n, status: 'completed',
    extra: { chainTransactionHashes: [HASH] } };
  let global = addNewActivities(globalState(), ACCOUNT_ID, [current]);
  global = applyActivitiesPatch(global, ACCOUNT_ID, { upsert: [buildBridgeActivity(operation())], removeIds: [],
    evidenceActivities: [evidence] });

  expect(global.byAccountId[ACCOUNT_ID].activities?.byId[current.id]).toMatchObject({
    fee: 42n, status: 'failed', shouldHide: true,
    extra: { queryId: 'newer-detail', chainTransactionHashes: [HASH] },
  });
});

it('keeps newer exact evidence when a delayed hydration response arrives', () => {
  const current = { ...rawTransaction(), externalMsgHashNorm: 'message',
    extra: { chainTransactionHashes: ['cd'.repeat(32)] } };
  let global = addNewActivities(globalState(), ACCOUNT_ID, [current, buildBridgeActivity(operation())]);
  global = applyActivitiesPatch(global, ACCOUNT_ID, { upsert: [], removeIds: [], evidenceActivities: [
    { ...current, extra: { chainTransactionHashes: [HASH] } },
  ] });

  expect(global.byAccountId[ACCOUNT_ID].activities?.byId[current.id]).toMatchObject({
    extra: { chainTransactionHashes: ['cd'.repeat(32)] },
  });
  expect(global.byAccountId[ACCOUNT_ID].activities?.byId[current.id].shouldHide).not.toBe(true);
});
