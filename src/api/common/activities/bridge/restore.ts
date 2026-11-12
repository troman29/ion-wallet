import type { ApiBridgeOperation } from '../../../types';
import type { ApiBridgeTransfer } from '../../../types/bridge';

import { normalizeBridgeAddress, normalizeBridgeHash } from './identity';
import { getBridgeActivityId } from './projection';

/** Local signing data survives a match; the operation's public evidence and status follow the server revision. */
export function mergeServerBridgeTransfers(
  accountId: string,
  localTransfers: readonly ApiBridgeTransfer[],
  operations: readonly ApiBridgeOperation[],
) {
  const remaining = new Set(localTransfers);
  const candidatesByOperation = new Map(operations.map((operation) => [operation,
    localTransfers.filter((transfer) => matchesServerOperation(transfer, operation))]));
  const matchCounts = new Map<ApiBridgeTransfer, number>();
  for (const candidates of candidatesByOperation.values()) {
    for (const candidate of candidates) matchCounts.set(candidate, (matchCounts.get(candidate) ?? 0) + 1);
  }
  const restored = operations.map((operation) => {
    const candidates = candidatesByOperation.get(operation)!;
    const local = candidates.length === 1 && matchCounts.get(candidates[0]) === 1 ? candidates[0] : undefined;
    if (local) remaining.delete(local);
    if (local?.serverRevision && BigInt(local.serverRevision) > BigInt(operation.revision)) return local;

    return {
      ...local,
      accountId,
      id: local?.id ?? getBridgeActivityId(operation.id, operation.network),
      serverOperationId: operation.id,
      serverRevision: operation.revision,
      serverOperation: operation,
      serverSourceTxHash: operation.sourceTransaction?.hash,
      serverDestinationTxHash: operation.destinationTransaction?.hash,
      source: operation.source,
      fromAddress: operation.fromAddress,
      toAddress: operation.toAddress,
      amount: operation.amount,
      receiveAmount: operation.receiveAmount,
      bridgeFee: operation.bridgeFee ?? local?.bridgeFee ?? '0',
      networkFee: local?.networkFee ?? '0',
      balance: local?.balance ?? '0',
      maxAmount: local?.maxAmount ?? '0',
      expiresAt: local?.expiresAt ?? 0,
      createdAt: operation.timestamp,
      status: operation.status,
      swapId: operation.swapId ?? local?.swapId,
      swapData: operation.swapData ?? local?.swapData,
      txId: local?.txId ?? (operation.source === 'ton'
        ? findSourceMessageHash(operation) : operation.sourceTransaction?.hash),
      claimTxId: operation.source === 'ton'
        ? operation.destinationTransaction?.hash ?? local?.claimTxId : local?.claimTxId,
      ...(operation.status === 'completed' || operation.status === 'failed' ? {
        nativeSubmission: undefined, nativeRecovery: undefined, signedEvmTransaction: undefined,
      } : {}),
    } satisfies ApiBridgeTransfer;
  });

  return [...restored, ...remaining].sort((first, second) => second.createdAt - first.createdAt);
}

function matchesServerOperation(transfer: ApiBridgeTransfer, operation: ApiBridgeOperation) {
  if (transfer.source !== operation.source) return false;

  if (transfer.serverOperationId) return transfer.serverOperationId === operation.id;
  if (transfer.id === getBridgeActivityId(operation.id, operation.network)) return true;

  if (transfer.swapId && operation.swapId) return transfer.swapId.toLowerCase() === operation.swapId.toLowerCase();

  const source = operation.sourceTransaction;
  if (operation.source === 'bnb') {
    return Boolean(transfer.txId && source?.hash && transfer.txId.toLowerCase() === source.hash.toLowerCase()
      && (transfer.logIndex === undefined || transfer.logIndex === source.logIndex));
  }

  const messageHash = findSourceMessageHash(operation);

  return Boolean(transfer.txId && messageHash && normalizeBridgeHash(transfer.txId) === normalizeBridgeHash(messageHash)
    && normalizeBridgeAddress(transfer.fromAddress, 'ton') === normalizeBridgeAddress(operation.fromAddress, 'ton')
    && transfer.toAddress.toLowerCase() === operation.toAddress.toLowerCase()
    && transfer.amount === operation.amount);
}

function findSourceMessageHash(operation: ApiBridgeOperation) {
  const hashes = new Set(operation.components.filter((component) => component.role === 'source'
    && component.chain === 'ton' && component.fromAddress
    && normalizeBridgeAddress(component.fromAddress, 'ton') === normalizeBridgeAddress(operation.fromAddress, 'ton')
    && component.amount === operation.amount && component.externalMsgHashNorm)
    .map(({ externalMsgHashNorm }) => normalizeBridgeHash(externalMsgHashNorm!)));

  return hashes.size === 1 ? [...hashes][0] : undefined;
}
