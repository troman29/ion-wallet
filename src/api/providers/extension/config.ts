// Port and channel names are runtime-only, but must differ per brand: with both extensions installed on one page,
// a shared postMessage channel would cross-wire their dApp bridges.
export const POPUP_PORT = 'MyWallet_popup';
export const CONTENT_SCRIPT_PORT = 'MyWallet_contentScript';
export const PAGE_CONNECTOR_CHANNEL = 'MyWallet_pageConnector';
