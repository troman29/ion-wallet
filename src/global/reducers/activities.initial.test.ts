import '../../util/bigintPatch';

import type { ApiTransactionActivity } from '../../api/types';
import type { GlobalState } from '../types';

import { GLOBAL_STATE_CACHE_KEY } from '../../config';
import { loadCache, saveGlobalCacheNow } from '../cache';
import { INITIAL_STATE } from '../initialState';
import { addInitialActivities, addNewActivities } from './activities';

const ACCOUNT_ID = '0-mainnet';

function buildGlobal(): GlobalState {
  return {
    ...INITIAL_STATE,
    currentAccountId: ACCOUNT_ID,
    accounts: {
      byId: {
        [ACCOUNT_ID]: {
          title: 'Test',
          type: 'mnemonic',
          byChain: { ton: { address: 'ton-address' }, bnb: { address: 'bnb-address' } },
        },
      },
    },
    byAccountId: {
      [ACCOUNT_ID]: { balances: { bySlug: { toncoin: 1n, bnb: 1n } } },
    },
  } as unknown as GlobalState;
}

function transfer(id: string, slug: string, timestamp: number): ApiTransactionActivity {
  return {
    id,
    kind: 'transaction',
    slug,
    timestamp,
    amount: 1n,
    isIncoming: true,
    fromAddress: 'from',
    toAddress: 'to',
    fee: 0n,
    status: 'completed',
  } as ApiTransactionActivity;
}

function restart(global: GlobalState) {
  saveGlobalCacheNow(global);
  return loadCache(INITIAL_STATE);
}

function groupBySlug(activities: ApiTransactionActivity[]) {
  return Object.fromEntries(activities.map((activity) => [activity.slug, [activity]]));
}

afterEach(() => {
  localStorage.removeItem(GLOBAL_STATE_CACHE_KEY);
});

// The TON polling resumes from the cached newest activity and never reports its initial activities in that session
it('shows the initial activities of a chain loaded after the other chains resumed from the cache', () => {
  const tonActivity = transfer('ton-tx', 'toncoin', 1000);
  const deposit1 = transfer('bnb-deposit-1', 'bnb', 2000);
  const deposit2 = transfer('bnb-deposit-2', 'bnb', 3000);

  // The first launch: the TON wallet has history, the BNB backend is still backfilling an empty address
  let global = buildGlobal();
  global = addInitialActivities(global, ACCOUNT_ID, [tonActivity], groupBySlug([tonActivity]), 'ton', false);
  global = addInitialActivities(global, ACCOUNT_ID, [], {}, 'bnb', true);
  expect(global.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual([tonActivity.id]);

  // The next launch: only BNB loads its initial activities, because it has no cached newest activity
  global = restart(global);
  global = addInitialActivities(global, ACCOUNT_ID, [deposit1], groupBySlug([deposit1]), 'bnb', true);
  expect(global.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual([deposit1.id, tonActivity.id]);

  // The next launch: both chains resume from the cache and only receive new activities
  global = restart(global);
  global = addNewActivities(global, ACCOUNT_ID, [deposit2], 'bnb');
  expect(global.byAccountId[ACCOUNT_ID].activities?.idsMain).toEqual([deposit2.id, deposit1.id, tonActivity.id]);
});
