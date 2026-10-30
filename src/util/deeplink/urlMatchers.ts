import { ION_GATEWAY_UNIVERSAL_URL, WALLETCONNECT_UNIVERSAL_URLS } from './constants';

const gatewayOrigin = new URL(ION_GATEWAY_UNIVERSAL_URL).origin;
const walletConnectUrl = new URL(WALLETCONNECT_UNIVERSAL_URLS[0]);

export function isIonGatewayUniversalLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === gatewayOrigin && url.pathname === '/';
  } catch {
    return false;
  }
}

export function isWalletConnectUniversalLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.origin === walletConnectUrl.origin
      && (url.pathname === walletConnectUrl.pathname || url.pathname.startsWith(`${walletConnectUrl.pathname}/`));
  } catch {
    return false;
  }
}
