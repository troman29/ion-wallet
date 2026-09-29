import type { ApiTokenWithPrice, ApiTransaction } from '../../api/types';

import { TINY_TRANSFER_MAX_COST } from '../../config';
import { isScamTransaction } from '../../util/activities';
import { toBig } from '../../util/decimals';

export function getIsTinyOrScamTransaction(transaction: ApiTransaction, token?: ApiTokenWithPrice) {
  if (isScamTransaction(transaction)) return true;
  if (!token || transaction.nft) return false;

  const isOutgoingBouncedSpam = transaction.type === 'bounced' && !transaction.isIncoming;
  const isMint = transaction.type === 'mint';
  // A plain outgoing transfer is one the user signed themselves. Hiding it by value would make their own
  // transaction disappear right after it confirms, so the cost threshold only applies to unsolicited activity.
  const isIncomingPlainTransfer = !transaction.type && transaction.isIncoming;

  if (!isIncomingPlainTransfer && !isOutgoingBouncedSpam && !isMint) return false;

  const cost = toBig(transaction.amount, token.decimals).abs().mul(token.priceUsd ?? 0);
  return cost.lt(TINY_TRANSFER_MAX_COST);
}
