import { Address } from '@ton/core';

import type { ApiBridgeTransfer } from '../types/bridge';
import type { BridgeTransaction } from './helpers';

import { BRIDGE_CONFIG, BRIDGE_TRANSACTION_PAGE_SIZE } from './config';
import { parseAccountId } from '../../util/account';
import { TRANSFER_TIMEOUT_SEC } from '../chains/ton/constants';
import { getTonClient } from '../chains/ton/util/tonCore';
import { areIonAddressesEqual } from './helpers';

export async function recoverExpiredNativeTransfer(transfer: ApiBridgeTransfer): Promise<ApiBridgeTransfer> {
  if (transfer.nativeRecovery?.sourceConfirmed) return transfer;

  const validUntil = transfer.nativeSubmission?.validUntil ?? transfer.nativeRecovery?.validUntil;
  if (!validUntil) {
    // A legacy intent may already have been broadcast. Its signature must expire before it can be retired.
    return {
      ...transfer,
      nativeRecovery: {
        validUntil: Math.max(Math.ceil(Date.now() / 1000), Math.ceil(transfer.createdAt / 1000))
          + TRANSFER_TIMEOUT_SEC,
      },
    };
  }

  const { network } = parseAccountId(transfer.accountId);
  const client = getTonClient(network);
  if (Date.now() / 1000 < validUntil && transfer.nativeSubmission?.seqno !== 0) return transfer;

  const info = await client.getAddressInfo(transfer.fromAddress);
  let isSequenceConsumed = false;
  if (transfer.nativeSubmission?.seqno === 0 || !transfer.nativeSubmission) {
    // First wallet messages have no expiry. A legacy intent may also have used `seqno` zero.
    if (info.state !== 'active') return transfer;

    const result = await client.runMethod(Address.parse(transfer.fromAddress), 'seqno');
    const currentSeqno = result.stack.readBigNumber();
    isSequenceConsumed = transfer.nativeSubmission?.seqno === 0 && currentSeqno > 0n;
    if (currentSeqno <= 0n && !transfer.nativeSubmission) return transfer;
  }

  if (!isSequenceConsumed) {
    const { workchain, shard, seqno } = info.block_id;
    const header = await client.callRpc('getBlockHeader', { workchain, shard, seqno });
    // Chain time proves that the signed message can no longer be accepted
    if (!(header.gen_utime > validUntil)) return transfer;
  }

  const recovery = transfer.nativeRecovery;
  const transactions: BridgeTransaction[] = await client.callRpc('getTransactions', {
    address: transfer.fromAddress,
    limit: BRIDGE_TRANSACTION_PAGE_SIZE,
    archival: true,
    ...(recovery?.scanLt ? { lt: recovery.scanLt, hash: recovery.scanHash } : {}),
  });

  // Logical time is independent of the phone clock. Records without a boundary require a full sender scan.
  const earliestLt = BigInt(transfer.nativeStartLt ?? '0');
  const bridge = BRIDGE_CONFIG[network].bridge;
  const amount = BigInt(transfer.amount);
  const comment = `swapTo#${transfer.toAddress}`.toLowerCase();

  const hasBeenSent = transactions.some((transaction) => {
    if (transfer.nativeStartLt && BigInt(transaction.transaction_id.lt) <= earliestLt) return false;

    return transaction.out_msgs.some((message) => areIonAddressesEqual(message.destination, bridge)
      && BigInt(message.value) === amount
      && message.message?.trim().toLowerCase() === comment);
  });

  if (hasBeenSent) {
    return { ...transfer, nativeSubmission: undefined, nativeRecovery: { validUntil, sourceConfirmed: true } };
  }

  const last = transactions[transactions.length - 1];
  if (last && transactions.length >= BRIDGE_TRANSACTION_PAGE_SIZE && BigInt(last.transaction_id.lt) > earliestLt
    && last.transaction_id.lt !== recovery?.scanLt) {
    return {
      ...transfer,
      nativeRecovery: { validUntil, scanLt: last.transaction_id.lt, scanHash: last.transaction_id.hash },
    };
  }

  return {
    ...transfer,
    status: 'failed',
    nativeSubmission: undefined,
    nativeRecovery: undefined,
    error: 'Transfer was not sent. Please try again.',
  };
}
