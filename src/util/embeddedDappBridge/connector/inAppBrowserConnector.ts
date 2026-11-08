import {
  APP_NAME,
  EMBEDDED_DAPP_BRIDGE_CHANNEL,
  ION_BNB_MAINNET,
  TONCONNECT_PROTOCOL_VERSION,
  TONCONNECT_WALLET_JSBRIDGE_KEY,
} from '../../../config';
import { registerEvmInjectedWallet } from '../../injectedConnector/evmConnector';
import { INJECTED_ICON } from '../../injectedConnector/injectedIcon';
import { tonConnectGetDeviceInfo } from '../../tonConnectEnvironment';
import { initConnectorString } from './connector';
import { PANCAKESWAP_HOST, patchPancakeSwap } from './pancakeSwapPatch';

// The strings are JSON-encoded: the icon is a multi-line SVG, and a raw newline breaks the injected script
export function buildInAppBrowserBridgeConnectorCode() {
  return `
(${initConnectorString})(
  ${JSON.stringify(TONCONNECT_WALLET_JSBRIDGE_KEY)},
  ${JSON.stringify(EMBEDDED_DAPP_BRIDGE_CHANNEL)},
  'cordova_iab' in window ? window.cordova_iab : window.webkit.messageHandlers.cordova_iab,
  {
    deviceInfo: ${JSON.stringify(tonConnectGetDeviceInfo())},
    protocolVersion: ${TONCONNECT_PROTOCOL_VERSION},
    isWalletBrowser: true,
  },
  ${JSON.stringify(APP_NAME)},
  ${JSON.stringify(INJECTED_ICON)},
  ${registerEvmInjectedWallet.toString()}
);
(${patchPancakeSwap.toString()})(${JSON.stringify(PANCAKESWAP_HOST)}, ${JSON.stringify(ION_BNB_MAINNET.tokenAddress)});
`;
}
