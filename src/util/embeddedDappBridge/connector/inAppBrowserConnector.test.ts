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
