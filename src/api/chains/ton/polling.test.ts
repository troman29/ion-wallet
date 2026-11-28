import type { ApiAccountWithChain, ApiBackendStakingState, ApiStakingCommonData, OnApiUpdate } from '../../types';
import type { WalletState } from './toncenter/types';

import Deferred from '../../../util/Deferred';
import { resetFetchStateForTests } from '../../../util/fetch';
import { resetThrottledProviderFetchers } from '../../../util/ThrottledFetcher';
import { setStakingCommonCache } from '../../common/cache';
import { tokensPreload } from '../../common/tokens';
import { tokenRepository } from '../../db';
import { setEnvironment } from '../../environment';
import { storage } from '../../storages';
import { setupActivePolling } from './polling';

type FetchRequest = string | URL | Request;

const ACCOUNT_ID = '0-mainnet';
const RAW_ADDRESS = `0:${'0'.repeat(64)}`;
const ADDRESS = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';
const STAKING_STATE_PATH = `/staking/state/${ADDRESS}`;
const JETTON_WALLETS_PATH = '/indexer/v3/jetton/wallets';
const ACCOUNT: ApiAccountWithChain<'ton'> = {
  type: 'view',
  byChain: { ton: { address: ADDRESS, index: 0, version: 'W5', isInitialized: true } },
};
const WALLET_STATE: WalletState = {
  address: RAW_ADDRESS,
  balance: '10',
  status: 'active',
  is_wallet: false,
  code_hash: '',
  last_transaction_hash: '',
  last_transaction_lt: 0,
};
const COMMON_STAKING_DATA: ApiStakingCommonData = {
  liquid: { currentRate: 1, nextRoundRate: 1, apy: 0, available: 0n, tvl: 0n, totalStakers: 0 },
  round: { start: 0, end: 0, unlock: 0 },
  prevRound: { start: 0, end: 0, unlock: 0 },
  jettonPools: [],
};
const BALANCE_OUTAGE_MS = 40_000;
const RECOVERY_WINDOW_MS = 30_000;
const STAKING_STATE: ApiBackendStakingState = { liquid: { unstakeRequestAmount: '2' } };
const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(0);
  setEnvironment({});
  setStakingCommonCache('ton', COMMON_STAKING_DATA);
  tokensPreload.resolve();
  jest.spyOn(storage, 'getItem').mockResolvedValue({ [ACCOUNT_ID]: ACCOUNT });
  jest.spyOn(tokenRepository, 'bulkPut').mockResolvedValue(undefined);
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  jest.restoreAllMocks();
  jest.useRealTimers();
  resetFetchStateForTests();
  resetThrottledProviderFetchers();
});

it('ION-94: publishes current unstaking data on the first staking update after a cold indexer outage', async () => {
  const recoveredAt = Date.now() + BALANCE_OUTAGE_MS;
  const { stop, onUpdate } = startPolling((path) => {
    const isIndexerAvailable = Date.now() >= recoveredAt;
    if (path === JETTON_WALLETS_PATH && !isIndexerAvailable) {
      return jsonResponse({}, 503);
    }
    if (path === STAKING_STATE_PATH && !isIndexerAvailable) {
      return jsonResponse({ liquid: { unstakeRequestAmount: '0' } });
    }
    return defaultPollingResponse(path);
  });

  try {
    await jest.advanceTimersByTimeAsync(BALANCE_OUTAGE_MS - 1);
    expect(onUpdate.mock.calls.some(([update]) => update.type === 'updateStaking')).toBe(false);

    await jest.advanceTimersByTimeAsync(RECOVERY_WINDOW_MS);
    const [firstStakingUpdate] = onUpdate.mock.calls.find(([update]) => update.type === 'updateStaking') ?? [];
    expect(firstStakingUpdate).toMatchObject({
      type: 'updateStaking',
      states: [expect.objectContaining({ unstakeRequestAmount: 2_000_000_000n })],
    });
  } finally {
    stop();
  }
});

it('does not request wallet-specific staking data if polling stops before the first balance snapshot', async () => {
  const pendingJettons = new Deferred<Response>();
  const { stop, requestedPaths } = startPolling((path) => {
    if (path === JETTON_WALLETS_PATH) {
      return pendingJettons.promise;
    }
    return defaultPollingResponse(path);
  });

  try {
    await jest.advanceTimersByTimeAsync(1_000);
  } finally {
    stop();
  }
  pendingJettons.resolve(defaultPollingResponse(JETTON_WALLETS_PATH));
  await jest.advanceTimersByTimeAsync(1_000);

  expect(requestedPaths).toContain(JETTON_WALLETS_PATH);
  expect(requestedPaths).not.toContain(STAKING_STATE_PATH);
});

it('does not publish an in-flight staking response after polling stops', async () => {
  const pendingStakingState = new Deferred<Response>();
  const { stop, requestedPaths, onUpdate } = startPolling((path) => {
    if (path === STAKING_STATE_PATH) {
      return pendingStakingState.promise;
    }
    return defaultPollingResponse(path);
  });

  try {
    await jest.advanceTimersByTimeAsync(2_000);
  } finally {
    stop();
  }
  pendingStakingState.resolve(defaultPollingResponse(STAKING_STATE_PATH));
  await jest.advanceTimersByTimeAsync(1_000);

  expect(requestedPaths).toContain(STAKING_STATE_PATH);
  expect(onUpdate.mock.calls.some(([update]) => update.type === 'updateStaking')).toBe(false);
});

function startPolling(respond: (path: string) => Response | Promise<Response>) {
  const requestedPaths: string[] = [];
  globalThis.fetch = (input: FetchRequest) => {
    const url = typeof input === 'string' || input instanceof URL ? input : input.url;
    const { pathname } = new URL(url);
    requestedPaths.push(pathname);
    return Promise.resolve(respond(pathname));
  };
  const onUpdate = jest.fn<ReturnType<OnApiUpdate>, Parameters<OnApiUpdate>>();
  const stop = setupActivePolling(ACCOUNT_ID, ACCOUNT, onUpdate, jest.fn(), {});
  return { requestedPaths, onUpdate, stop };
}

function defaultPollingResponse(path: string): Response {
  switch (path) {
    case STAKING_STATE_PATH:
      return jsonResponse(STAKING_STATE);
    case JETTON_WALLETS_PATH:
      return jsonResponse({ jetton_wallets: [] });
    case '/indexer/v3/walletStates':
      return jsonResponse({
        wallets: [WALLET_STATE],
        address_book: { [RAW_ADDRESS]: { user_friendly: ADDRESS } },
      });
    case '/indexer/v3/actions':
    case '/indexer/v3/pendingActions':
      return jsonResponse({ actions: [] });
    case '/indexer/v3/nft/items':
      return jsonResponse({ nft_items: [] });
    case '/indexer/v3/nft/transfers':
      return jsonResponse({ nft_transfers: [] });
    case '/dns/getDomains':
      return jsonResponse({});
    default:
      throw new Error(`Unexpected request: ${path}`);
  }
}

function jsonResponse(payload: object, status = 200): Response {
  return { status, ok: status === 200, headers: new Headers(), json: () => Promise.resolve(payload) } as Response;
}
