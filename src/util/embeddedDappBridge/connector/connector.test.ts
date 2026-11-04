import type { DeviceInfo } from '@tonconnect/protocol';

import { TONCONNECT_WALLET_JSBRIDGE_KEY } from '../../../config';
import { initConnector } from './connector';

describe('initConnector', () => {
  it('exposes the bridge where the ION Gateway SDK looks for it', () => {
    initConnector(
      TONCONNECT_WALLET_JSBRIDGE_KEY,
      'test-channel',
      { postMessage: jest.fn() } as unknown as Window,
      {
        deviceInfo: {} as DeviceInfo,
        protocolVersion: 2,
        isWalletBrowser: true,
      },
      'ION Wallet',
      '',
      jest.fn(),
    );

    const injected = (window as any)[TONCONNECT_WALLET_JSBRIDGE_KEY];

    expect('ionconnect' in injected).toBe(true);
    expect(injected.ionconnect.isWalletBrowser).toBe(true);
    expect(typeof injected.ionconnect.connect).toBe('function');
  });
});
