import type { ApiTransactionActivity } from '../../api/types';
import type { GlobalState } from '../types';

import { INITIAL_STATE } from '../initialState';
import { addInitialActivities, addNewActivities } from './activities';

const ACCOUNT_ID = 'test-account';
const HASH = 'normalized-external-hash';

function buildGlobal(): GlobalState {
  return {
    ...INITIAL_STATE,
    currentAccountId: ACCOUNT_ID,
    accounts: {
      byId: {
        [ACCOUNT_ID]: {
          title: 'Test',
          type: 'mnemonic',
          byChain: { ton: { address: 'test-address' } },
        },
      },
    },
    byAccountId: { [ACCOUNT_ID]: {} },
  } as unknown as GlobalState;
}

function activity(id: string, status: ApiTransactionActivity['status'], hash = HASH): ApiTransactionActivity {
  return {
    id,
    externalMsgHashNorm: hash,
    kind: 'transaction',
    type: 'unstakeRequest',
    amount: 0n,
    fee: 0n,
    fromAddress: 'wallet',
    toAddress: 'pool',
    normalizedAddress: 'pool',
    slug: 'toncoin',
    isIncoming: false,
    status,
    timestamp: 1000,
  };
}

describe('local activity reconciliation', () => {
  it('replaces an optimistic withdrawal with the failed chain action by external message hash', () => {
    let global = addNewActivities(buildGlobal(), ACCOUNT_ID, [activity(`${HASH}::local`, 'pendingTrusted')]);
    global = {
      ...global,
      byAccountId: {
        ...global.byAccountId,
        [ACCOUNT_ID]: { ...global.byAccountId[ACCOUNT_ID], currentActivityId: `${HASH}::local` },
      },
    };

    global = addNewActivities(global, ACCOUNT_ID, [
      activity('other:action', 'completed', 'other-hash'),
      { ...activity('trace:refund', 'completed'), type: 'excess' },
      activity('trace:failed-action', 'failed'),
    ]);

    const { activities, currentActivityId } = global.byAccountId[ACCOUNT_ID];
    expect(activities?.localActivityIds).toEqual([]);
    expect(activities?.idsMain).not.toContain(`${HASH}::local`);
    expect(activities?.byId[`${HASH}::local`]).toBeUndefined();
    expect(activities?.byId['trace:failed-action']?.status).toBe('failed');
    expect(currentActivityId).toBe('trace:failed-action');
  });

  it('reconciles cached local activity when initial history arrives after restart', () => {
    let global = addNewActivities(buildGlobal(), ACCOUNT_ID, [activity(`${HASH}::local`, 'pendingTrusted')]);
    global = addInitialActivities(global, ACCOUNT_ID, [activity('trace:failed-action', 'failed')], {}, 'ton', false);

    expect(global.byAccountId[ACCOUNT_ID].activities?.localActivityIds).toEqual([]);
    expect(global.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual(['trace:failed-action']);
  });

  it('keeps a local activity when only a different external message is finalized', () => {
    let global = addNewActivities(buildGlobal(), ACCOUNT_ID, [activity(`${HASH}::local`, 'pendingTrusted')]);
    global = addNewActivities(global, ACCOUNT_ID, [activity('other:action', 'failed', 'other-hash')]);

    expect(global.byAccountId[ACCOUNT_ID].activities?.localActivityIds).toEqual([`${HASH}::local`]);
  });
});
