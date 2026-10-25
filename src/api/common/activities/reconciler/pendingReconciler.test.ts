import type { ApiTransactionActivity } from '../../../types';

import { reconcileNewActivitiesUpdate } from './pendingReconciler';

const HASH = 'normalized-external-hash';

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

describe('activity reconciliation', () => {
  it('replaces a local withdrawal with its unique failed chain action', () => {
    const local = activity(`${HASH}:0:local`, 'pendingTrusted');
    const failed = activity('trace:failed-action', 'failed');
    const result = reconcileNewActivitiesUpdate([local], [failed]);

    expect(result.patch.removeIds).toEqual([local.id]);
    expect(result.patch.replacedIds).toEqual({ [local.id]: failed.id });
    expect(result.confirmedActivities[0].status).toBe('failed');
  });

  it('does not choose between multiple visible actions sharing an external hash', () => {
    const local = activity(`${HASH}:0:local`, 'pendingTrusted');
    const result = reconcileNewActivitiesUpdate([local], [
      activity('trace:failed-action', 'failed'),
      activity('trace:other-action', 'completed'),
    ]);

    expect(result.patch.removeIds).toEqual([]);
    expect(result.patch.replacedIds).toEqual({});
  });

  it('does not replace a withdrawal with a partial refund update', () => {
    const local = activity(`${HASH}:0:local`, 'pendingTrusted');
    const result = reconcileNewActivitiesUpdate([local], [
      { ...activity('trace:refund', 'completed'), type: 'excess' },
    ]);

    expect(result.patch.removeIds).toEqual([]);
  });

  it('preserves a final status if a late pending update has the same action id', () => {
    const failed = activity('trace:failed-action', 'failed');
    const result = reconcileNewActivitiesUpdate([failed], [], [activity(failed.id, 'pending')]);

    expect(result.pendingActivities?.[0].status).toBe('failed');
  });

  it('keeps local activity for a different external message', () => {
    const local = activity(`${HASH}:0:local`, 'pendingTrusted');
    const result = reconcileNewActivitiesUpdate([local], [activity('other:action', 'failed', 'other-hash')]);

    expect(result.patch.removeIds).toEqual([]);
  });
});
