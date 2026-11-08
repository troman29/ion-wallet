import { DappProtocolType } from '../dappProtocols/types';

import { getDappConnectionUniqueId } from '../../util/getDappConnectionUniqueId';
import { migrateStorage } from './helpers';

const mockStore = new Map<string, unknown>();

jest.mock('../storages', () => ({
  storage: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key))),
    setItem: jest.fn((key: string, value: unknown) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
  },
}));

const BRIDGE_URL = 'https://bridge.ionwallet.io';
const tonConnection = { url: BRIDGE_URL, protocolType: DappProtocolType.TonConnect, chains: [{ chain: 'ton' }] };
const evmConnection = { url: BRIDGE_URL, protocolType: DappProtocolType.WalletConnect, chains: [{ chain: 'bnb' }] };

describe('in-app browser connections of one site', () => {
  beforeEach(() => mockStore.clear());

  it('keeps TonConnect and the injected EVM provider under different keys', () => {
    expect(getDappConnectionUniqueId({ url: BRIDGE_URL }, DappProtocolType.TonConnect))
      .not.toBe(getDappConnectionUniqueId({ url: BRIDGE_URL }, DappProtocolType.WalletConnect));
    expect(getDappConnectionUniqueId(evmConnection as any))
      .toBe(getDappConnectionUniqueId({ url: BRIDGE_URL }, DappProtocolType.WalletConnect));
  });

  it('moves an EVM connection off the TonConnect key and leaves TonConnect where it was', async () => {
    mockStore.set('stateVersion', 23);
    mockStore.set('dapps', {
      '0-mainnet': {
        [BRIDGE_URL]: { jsbridge: evmConnection },
        'https://dns.ice.io': { jsbridge: tonConnection },
      },
    });

    await migrateStorage();
    // A crash before the version stamp repeats the step
    mockStore.set('stateVersion', 23);
    await migrateStorage();

    const dapps = mockStore.get('dapps') as any;
    const evmId = getDappConnectionUniqueId(evmConnection as any);
    expect(dapps['0-mainnet'][BRIDGE_URL]).toEqual({ [evmId]: evmConnection });
    expect(dapps['0-mainnet']['https://dns.ice.io']).toEqual({ jsbridge: tonConnection });
  });
});
