import type { ApiActivity, ApiTransactionActivity } from '../../api/types';

import { getActivityContinuationTimestamp } from './index';

function makeActivity(
  id: string,
  timestamp: number,
  status: ApiTransactionActivity['status'] = 'completed',
): ApiTransactionActivity {
  return {
    id,
    kind: 'transaction',
    amount: 1n,
    fee: 0n,
    fromAddress: 'from',
    toAddress: 'to',
    normalizedAddress: 'to',
    slug: 'toncoin',
    isIncoming: true,
    status,
    timestamp,
  };
}

describe('getActivityContinuationTimestamp', () => {
  it('uses the oldest confirmed transaction as the cursor', () => {
    const activities: ApiActivity[] = [
      makeActivity('a', 300),
      makeActivity('b', 200),
      makeActivity('c', 100),
    ];

    expect(getActivityContinuationTimestamp(activities, (activity) => activity)).toBe(100);
  });

  it('skips older local and pending transactions when an on-chain cursor is available', () => {
    const activities: ApiActivity[] = [
      makeActivity('confirmed', 400),
      makeActivity('local:local', 300),
      makeActivity('pending', 200, 'pending'),
      makeActivity('pending-trusted', 100, 'pendingTrusted'),
    ];

    expect(getActivityContinuationTimestamp(activities, (activity) => activity)).toBe(400);
  });

  it('falls back to the oldest known activity when all transactions are local or pending', () => {
    const activities: ApiActivity[] = [
      makeActivity('a', 300, 'pendingTrusted'),
      makeActivity('b:local', 200),
      makeActivity('c', 100, 'pending'),
    ];

    expect(getActivityContinuationTimestamp(activities, (activity) => activity)).toBe(100);
  });

  it('can continue from a finalized failed transaction', () => {
    const activities = [makeActivity('completed', 200), makeActivity('failed', 100, 'failed')];

    expect(getActivityContinuationTimestamp(activities, (activity) => activity)).toBe(100);
  });

  it('has no answer for an empty slice', () => {
    expect(getActivityContinuationTimestamp([], (activity) => activity)).toBeUndefined();
  });

  it('ignores gaps left by unknown ids', () => {
    expect(getActivityContinuationTimestamp([makeActivity('a', 300), undefined], (activity) => activity)).toBe(300);
  });
});

describe('getActivityContinuationTimestamp reading through ids', () => {
  it('answers from an id list without materializing the activities', () => {
    const byId: Record<string, ApiActivity> = {
      a: makeActivity('a', 300),
      b: makeActivity('b', 200),
      c: makeActivity('c', 100, 'pending'),
    };

    expect(getActivityContinuationTimestamp(['a', 'b', 'c'], (id) => byId[id])).toBe(200);
  });

  it('skips ids that name nothing', () => {
    const byId: Record<string, ApiActivity> = { a: makeActivity('a', 300) };

    expect(getActivityContinuationTimestamp(['a', 'missing'], (id) => byId[id])).toBe(300);
  });
});
