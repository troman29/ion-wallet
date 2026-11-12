import type { ApiBridgeSource } from '../../api/types/bridge';
import type { BridgeOperation } from './types';

import { ION_BNB_MAINNET, IONCOIN } from '../../config';

export const NETWORK_NAMES = { ton: 'ION Network', bnb: 'BNB Chain' };
export const QUOTE_EXPIRED_ERROR = 'The quote expired. Please review the transfer again.';
const QUOTE_CHANGED_ERROR = 'The quote changed. Please review the transfer again.';
export const BRIDGE_LOAD_ERROR = 'Unable to load the bridge. Please try again.';

// RPC details belong in the diagnostic log; user messages must have a translation
const USER_ERRORS = new Set([
  QUOTE_EXPIRED_ERROR,
  QUOTE_CHANGED_ERROR,
  'Minimum bridge amount is 10 ION.',
  'Insufficient ION balance.',
  'Not enough BNB for the network fee.',
  'Bridge requires an ION and BNB wallet in the same account.',
  'Bridge is temporarily unavailable.',
  'Unable to authorize the transfer.',
  'Waiting for bridge confirmations',
]);

export function getBridgeError(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  return USER_ERRORS.has(message) ? message : BRIDGE_LOAD_ERROR;
}

export function isQuoteError(error?: string) {
  return error === QUOTE_EXPIRED_ERROR || error === QUOTE_CHANGED_ERROR;
}

export function getBridgeDestination(source: ApiBridgeSource): ApiBridgeSource {
  return source === 'ton' ? 'bnb' : 'ton';
}

export function getBridgeToken(source: ApiBridgeSource) {
  return source === 'ton' ? IONCOIN : ION_BNB_MAINNET;
}

export function getOperationDetails(operation: BridgeOperation) {
  const isClaim = operation.type === 'claim';
  const quote = isClaim ? operation.transfer : operation.quote;

  return {
    quote,
    amount: isClaim ? quote.receiveAmount : quote.amount,
    fee: isClaim ? operation.fee : quote.networkFee,
    token: getBridgeToken(isClaim ? 'bnb' : quote.source),
  };
}
