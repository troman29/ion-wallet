import './misc';

import type { GlobalState } from '../../types';

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
