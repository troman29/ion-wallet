import type { ApiTransactionActivity } from '../../api/types';
import type { GlobalState } from '../types';

import { INITIAL_STATE } from '../initialState';
import { addInitialActivities, addPastActivities } from './activities';

const ACCOUNT_ID = 'test-account';

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

function activity(id: string, shouldHide = false): ApiTransactionActivity {
  return {
    id,
    kind: 'transaction',
    slug: 'toncoin',
    timestamp: 1000,
    status: 'failed',
    shouldHide,
  } as ApiTransactionActivity;
}

it('keeps hidden output actions for details and pagination without listing them', () => {
  const failedRequest = activity('trace:request');
  const refund = activity('trace:refund', true);
  let global = addInitialActivities(buildGlobal(), ACCOUNT_ID, [refund, failedRequest], {}, 'ton', false);

  expect(global.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual([failedRequest.id]);
  expect(global.byAccountId[ACCOUNT_ID].activities?.mainActivityIdsByChain?.ton)
    .toEqual([refund.id, failedRequest.id]);
  expect(global.byAccountId[ACCOUNT_ID].activities?.byId[refund.id]).toEqual(refund);

  global = addPastActivities(global, ACCOUNT_ID, 'toncoin', [refund, failedRequest]);
  expect(global.byAccountId[ACCOUNT_ID].activities?.idsBySlug?.toncoin).toEqual([failedRequest.id]);
});
