import '../../global/actions/api/dapps';
import '../../global/actions/ui/initial';

import { Address } from '@ton/core';
import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { getActions, setGlobal } from '../../global';

import type { WalletState } from '../../api/chains/ton/toncenter/types';
import type { ApiAccountWithChain, ApiDappTransfer } from '../../api/types';
import { ApiCommonError } from '../../api/types';
import { TransferState } from '../../global/types';

import { INITIAL_STATE } from '../../global/initialState';
import { resetFetchStateForTests } from '../../util/fetch';
import { cloneDeep } from '../../util/iteratees';
import { callApi } from '../../api';
import { signDappTransfers } from '../../api/chains/ton/dapp';
import { getWalletInfo } from '../../api/chains/ton/wallet';
import { setEnvironment } from '../../api/environment';
import { storage } from '../../api/storages';

import Dialogs from '../Dialogs';

jest.mock('../../api', () => ({ callApi: jest.fn() }));
jest.mock('../../util/notificationSound', () => ({ initializeSounds: jest.fn() }));
jest.mock('@capacitor/dialog', () => ({ Dialog: {} }), { virtual: true });

const NETWORK = 'mainnet';
const ACCOUNT_ID = '0-mainnet';
const RAW_ADDRESS = `0:${'1'.repeat(64)}`;
const WALLET_ADDRESS = Address.parseRaw(RAW_ADDRESS).toString({ bounceable: false });
const WALLET_STATE: WalletState = {
  address: RAW_ADDRESS,
  status: 'active',
  is_wallet: true,
  balance: '1000000000',
  seqno: 7,
  wallet_type: 'wallet v5 r1',
  wallet_id: 0,
  is_signature_allowed: true,
  code_hash: '',
  last_transaction_hash: '',
  last_transaction_lt: 0,
};
const ACCOUNT: ApiAccountWithChain<'ton'> = {
  type: 'ton',
  byChain: { ton: { address: WALLET_ADDRESS, version: 'W5', index: 0 } },
};
const DNS_BID: ApiDappTransfer = {
  chain: 'ton',
  toAddress: WALLET_ADDRESS,
  displayedToAddress: WALLET_ADDRESS,
  normalizedAddress: WALLET_ADDRESS,
  amount: 1n,
  networkFee: 1n,
  isDangerous: false,
};

function walletStatesResponse(status: number, body: unknown): Response {
  return { status, ok: status === 200, headers: new Headers(), json: () => Promise.resolve(body) } as Response;
}

function setUpDappConfirmation() {
  setGlobal({
    ...cloneDeep(INITIAL_STATE),
    currentAccountId: ACCOUNT_ID,
    currentDappTransfer: {
      state: TransferState.Password,
      promiseId: 'dns-bid',
      operationChain: 'ton',
      transactions: [DNS_BID],
      dapp: {
        name: 'ION DNS',
        url: 'https://dns.example',
        iconUrl: '',
        connectedAt: 0,
        chains: [{ chain: 'ton', network: NETWORK, address: WALLET_ADDRESS }],
      },
    },
  });
}

describe('ION-95: dapp confirmation without a verified wallet state', () => {
  let fetchMock: jest.Mock;
  let root: HTMLDivElement;
  let portals: HTMLDivElement;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    resetFetchStateForTests();
    setEnvironment({});
    jest.spyOn(storage, 'getItem').mockResolvedValue({ [ACCOUNT_ID]: ACCOUNT });
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    root = document.createElement('div');
    portals = document.createElement('div');
    portals.id = 'portals';
    document.body.append(root, portals);
    jest.mocked(callApi).mockImplementation(async (...[methodName]) => {
      if (methodName !== 'signDappTransfers') {
        throw new Error(`Unexpected worker call: ${methodName}`);
      }
      // Model the worker dropping rejected requests. No token: the real signer cannot read any key.
      return signDappTransfers(ACCOUNT_ID, [DNS_BID]).catch(() => undefined);
    });
    setUpDappConfirmation();
    TeactDOM.render(<Dialogs />, root);
  });

  afterEach(async () => {
    TeactDOM.render(undefined, root);
    await jest.runAllTimersAsync();
    root.remove();
    portals.remove();
    globalThis.fetch = originalFetch;
    jest.mocked(callApi).mockReset();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([
    { failure: 'exhausted HTTP 503 retries', status: 503, body: {} },
    {
      failure: 'an HTTP 200 response without the wallet address-book entry',
      status: 200,
      body: { wallets: [WALLET_STATE], address_book: {} },
    },
  ])('shows the server error without submitting the bid after $failure', async ({ status, body }) => {
    fetchMock.mockResolvedValueOnce(walletStatesResponse(200, {
      wallets: [WALLET_STATE],
      address_book: { [RAW_ADDRESS]: { user_friendly: WALLET_ADDRESS, domain: 'fixture.ion' } },
    }));
    const initialWalletInfo = getWalletInfo(NETWORK, WALLET_ADDRESS);
    await jest.runAllTimersAsync();
    await expect(initialWalletInfo).resolves.toMatchObject({ seqno: WALLET_STATE.seqno });

    fetchMock.mockResolvedValue(walletStatesResponse(status, body));
    getActions().submitDappTransfer();
    await jest.runAllTimersAsync();

    expect(portals.querySelector('[role="dialog"]')?.textContent)
      .toContain('An error on the server side. Please try again.');
    const workerCall = jest.mocked(callApi).mock;
    expect(workerCall.calls.map(([methodName]) => methodName)).toEqual(['signDappTransfers']);
    await expect(workerCall.results[0].value).resolves.toEqual({ error: ApiCommonError.ServerError });
  });
});
