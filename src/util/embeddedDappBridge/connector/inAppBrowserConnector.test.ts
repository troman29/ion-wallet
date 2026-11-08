import { INJECTED_ICON } from '../../injectedConnector/injectedIcon';
import { buildInAppBrowserBridgeConnectorCode } from './inAppBrowserConnector';

describe('buildInAppBrowserBridgeConnectorCode', () => {
  // The in-app browser runs this code in the dapp page; a syntax error leaves the dapp without the wallet bridge
  it('builds a valid script even though the wallet icon spans several lines', () => {
    expect(INJECTED_ICON).toContain('\n');

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    expect(() => new Function(buildInAppBrowserBridgeConnectorCode())).not.toThrow();
  });
});

describe('registerEvmInjectedWallet', () => {
  // The in-app browser injects the function as text, away from the module it was written in
  it('announces the provider when rebuilt from its source text', () => {
    const { registerEvmInjectedWallet } = jest.requireActual<typeof import('../../injectedConnector/evmConnector')>(
      '../../injectedConnector/evmConnector',
    );
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const register = new Function(`return (${registerEvmInjectedWallet.toString()})`)() as
      typeof registerEvmInjectedWallet;
    const announced = jest.fn();
    window.addEventListener('eip6963:announceProvider', announced);
    jest.useFakeTimers();

    try {
      register({ info: { uuid: 'id', name: 'ION Wallet', icon: '', rdns: 'io.ionwallet' }, provider: {} as never });
    } finally {
      jest.useRealTimers();
      window.removeEventListener('eip6963:announceProvider', announced);
    }

    expect(announced).toHaveBeenCalled();
  });
});
