import './misc';

import type { ApiChain } from '../../../api/types';
import type { AccountState, GlobalState } from '../../types';

import { BNB, ION_BNB_MAINNET, TONCOIN } from '../../../config';
import { addActionHandler, setGlobal } from '../../index';

jest.mock('../../index', () => ({
  addActionHandler: jest.fn(),
  getGlobal: jest.fn(),
  setGlobal: jest.fn(),
  getActions: jest.fn(() => ({})),
  withGlobal: jest.fn(() => (component: unknown) => component),
}));

jest.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeScanner: { requestPermissions: jest.fn(() => Promise.resolve({ camera: 'granted' })) },
}));

type ActionHandler = (global: GlobalState, actions: AnyLiteral, payload?: AnyLiteral) => unknown;

const ADDRESS = 'UQBLP8MAn-KMf-5Q3hsiKt0YFXkWi-Nl3BWh497M8-_zAIsO';

function getHandler(name: string): ActionHandler {
  const call = (addActionHandler as jest.Mock).mock.calls.find(([actionName]) => actionName === name);
  return call![1] as ActionHandler;
}

function makeGlobal(overrides: Partial<GlobalState> = {}) {
  return {
    settings: { isTestnet: false },
    accounts: { byId: {} },
    currentTransfer: { state: 0 },
    currentDomainLinking: { state: 0 },
    ...overrides,
  } as unknown as GlobalState;
}

describe('QR scan for the view-only wallet import', () => {
  beforeEach(() => (setGlobal as jest.Mock).mockClear());

  function lastGlobal() {
    return (setGlobal as jest.Mock).mock.calls.at(-1)![0] as GlobalState;
  }

  it('remembers that the scan is for the view-only import, not for a transfer in progress', async () => {
    await getHandler('requestOpenQrScanner')(makeGlobal(), {}, { isViewAccount: true });

    expect(lastGlobal().isQrScannerOpen).toBe(true);
    expect(lastGlobal().currentQrScan).toEqual({ isViewAccount: true });
  });

  it('hands a plain address to the import screen instead of starting a transfer', async () => {
    const startTransfer = jest.fn();

    await getHandler('handleQrCode')(
      makeGlobal({ currentQrScan: { isViewAccount: true } }),
      { startTransfer },
      { data: ` ${ADDRESS}\n` },
    );

    expect(lastGlobal().viewAccountQrAddress).toBe(ADDRESS);
    expect(startTransfer).not.toHaveBeenCalled();
  });

  it('takes the address out of a transfer link', async () => {
    await getHandler('handleQrCode')(
      makeGlobal({ currentQrScan: { isViewAccount: true } }),
      {},
      { data: `ion://transfer/${ADDRESS}?amount=1000000000` },
    );

    expect(lastGlobal().viewAccountQrAddress).toBe(ADDRESS);
  });
});

describe('receive network selection', () => {
  beforeEach(() => (setGlobal as jest.Mock).mockClear());

  function makeReceiveGlobal(accountState: Partial<AccountState> = {}) {
    return makeGlobal({
      currentAccountId: '0-mainnet',
      accounts: {
        byId: { '0-mainnet': { type: 'mnemonic', byChain: { ton: { address: ADDRESS }, bnb: { address: '0x123' } } } },
      },
      byAccountId: { '0-mainnet': accountState },
      tokenInfo: {
        bySlug: {
          [TONCOIN.slug]: { ...TONCOIN, priceUsd: 1, percentChange24h: 0 },
          [BNB.slug]: { ...BNB, priceUsd: 1, percentChange24h: 0 },
          [ION_BNB_MAINNET.slug]: { ...ION_BNB_MAINNET, priceUsd: 1, percentChange24h: 0 },
        },
      },
    });
  }

  function openReceive(global: GlobalState, chain?: ApiChain) {
    getHandler('openReceiveModal')(global, {}, chain ? { chain } : undefined);
    return (setGlobal as jest.Mock).mock.calls.at(-1)![0] as GlobalState;
  }

  it.each([
    [ION_BNB_MAINNET.slug, 'bnb'],
    [BNB.slug, 'bnb'],
    [TONCOIN.slug, 'ton'],
  ] as const)('opens the network of the selected %s token', (currentTokenSlug, chain) => {
    const global = openReceive(makeReceiveGlobal({ currentTokenSlug }));

    expect(global.isReceiveModalOpen).toBe(true);
    expect(global.byAccountId['0-mainnet'].receiveModalChain).toBe(chain);
  });

  it('prefers an explicit network over the selected token', () => {
    const global = openReceive(makeReceiveGlobal({ currentTokenSlug: ION_BNB_MAINNET.slug }), 'ton');

    expect(global.byAccountId['0-mainnet'].receiveModalChain).toBe('ton');
  });

  it.each([undefined, 'unknown-token'])('uses the default when the selected token is %s', (currentTokenSlug) => {
    const global = openReceive(makeReceiveGlobal({ currentTokenSlug, receiveModalChain: 'bnb' }));

    expect(global.byAccountId['0-mainnet'].receiveModalChain).toBeUndefined();
  });

  it('allows switching tabs and restores the token network on reopening', () => {
    let global = openReceive(makeReceiveGlobal({ currentTokenSlug: ION_BNB_MAINNET.slug }));
    global = getHandler('setReceiveActiveTab')(global, {}, { chain: 'ton' }) as GlobalState;
    expect(global.byAccountId['0-mainnet'].receiveModalChain).toBe('ton');

    global = getHandler('closeReceiveModal')(global, {}) as GlobalState;
    expect(global.isReceiveModalOpen).toBeUndefined();

    global = openReceive(global);
    expect(global.byAccountId['0-mainnet'].receiveModalChain).toBe('bnb');
  });

  it('updates the network when another token is selected before reopening', () => {
    const global = openReceive(makeReceiveGlobal({ currentTokenSlug: ION_BNB_MAINNET.slug }));
    global.byAccountId['0-mainnet'].currentTokenSlug = TONCOIN.slug;

    expect(openReceive(global).byAccountId['0-mainnet'].receiveModalChain).toBe('ton');
  });
});
