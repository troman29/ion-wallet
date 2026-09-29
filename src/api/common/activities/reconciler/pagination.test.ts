import type { ApiTransactionActivity } from '../../../types';

import { trimPageBoundaryTraceActivities } from './pagination';

const BASE_TIMESTAMP = 1_700_000_000_000;

function makeTransaction(overrides: Partial<ApiTransactionActivity> = {}): ApiTransactionActivity {
  return {
    kind: 'transaction',
    id: 'tx-hash',
    timestamp: BASE_TIMESTAMP,
    amount: -100n,
    fromAddress: 'from-address',
    toAddress: 'to-address',
    fee: 1n,
    slug: 'toncoin',
    isIncoming: false,
    normalizedAddress: 'normalized-address',
    status: 'completed',
    ...overrides,
  };
}

describe('activity pagination reconciler', () => {
  it('trims only the contiguous boundary tail and keeps earlier same-trace actions', () => {
    const boundaryA = makeTransaction({ id: 'boundary-trace:0', timestamp: BASE_TIMESTAMP - 1 });
    const other = makeTransaction({ id: 'other-trace:0', timestamp: BASE_TIMESTAMP - 2 });
    const boundaryB = makeTransaction({ id: 'boundary-trace:1', timestamp: BASE_TIMESTAMP - 3 });

    expect(trimPageBoundaryTraceActivities([boundaryA, other, boundaryB])).toEqual([boundaryA, other]);
  });

  it('keeps the page when trimming would drop every activity', () => {
    const activities = [
      makeTransaction({ id: 'boundary-trace:0' }),
      makeTransaction({ id: 'boundary-trace:1' }),
    ];

    expect(trimPageBoundaryTraceActivities(activities)).toEqual(activities);
  });

  it('keeps very large boundary traces raw instead of dropping too much history', () => {
    const activities = Array.from({ length: 11 }, (_, index) => makeTransaction({ id: `boundary-trace:${index}` }));
    const withOlderActivity = [makeTransaction({ id: 'older-trace:0' }), ...activities];

    expect(trimPageBoundaryTraceActivities(withOlderActivity)).toEqual(withOlderActivity);
  });
});
