import { isIonGatewayUniversalLink, isWalletConnectUniversalLink } from './urlMatchers';

describe('ION Wallet connection links', () => {
  it('routes the root path to ION Gateway and /wc to WalletConnect', () => {
    expect(isIonGatewayUniversalLink('https://connect.ionwallet.io/?v=2&id=app')).toBe(true);
    expect(isIonGatewayUniversalLink('https://connect.ionwallet.io/wc?uri=wc%3Atest')).toBe(false);
    expect(isWalletConnectUniversalLink('https://connect.ionwallet.io/wc?uri=wc%3Atest')).toBe(true);
    expect(isWalletConnectUniversalLink('https://connect.ionwallet.io/wc-evil')).toBe(false);
  });

  it.each([
    'https://connect.ionwallet.io.evil.example/',
    'https://connect.ionwallet.io@evil.example/',
    'http://connect.ionwallet.io/',
    'https://connect.ionwallet.io:444/',
  ])('rejects an untrusted origin: %s', (url) => {
    expect(isIonGatewayUniversalLink(url)).toBe(false);
    expect(isWalletConnectUniversalLink(`${url}wc`)).toBe(false);
  });
});
