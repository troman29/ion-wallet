import type { ApiBridgeTransfer } from '../types/bridge';

import { createTaskQueue } from '../../util/schedulers';
import { normalizeBridgeAddress } from '../common/activities/bridge/identity';
import { getCurrentStorage, storage, withStorage } from '../storages';
import { getBridgeAccount } from './context';

// Signing and writes share a queue with status polling to prevent concurrent submissions
const queue = createTaskQueue(1);

export function runBridgeTask<T>(task: () => Promise<T>) {
  const runtimeStorage = getCurrentStorage();

  return queue.run(() => withStorage(runtimeStorage, task));
}

export async function readTransfers(accountId: string) {
  const addresses = await getBridgeAccount(accountId);
  const all: ApiBridgeTransfer[] = (await storage.getItem('bridgeTransfers')) ?? [];

  return all.filter((transfer) => {
    if (transfer.accountId !== accountId) return false;

    const destination = transfer.source === 'ton' ? 'bnb' : 'ton';
    const isSender = normalizeBridgeAddress(transfer.fromAddress, transfer.source)
      === normalizeBridgeAddress(addresses[transfer.source === 'ton' ? 'ion' : 'bnb'], transfer.source);
    const isRecipient = normalizeBridgeAddress(transfer.toAddress, destination)
      === normalizeBridgeAddress(addresses[transfer.source === 'ton' ? 'bnb' : 'ion'], destination);

    return transfer.serverOperationId ? isSender || isRecipient : isSender && isRecipient;
  });
}

export async function saveTransfer(transfer: ApiBridgeTransfer) {
  const all: ApiBridgeTransfer[] = (await storage.getItem('bridgeTransfers')) ?? [];
  await storage.setItem('bridgeTransfers', [transfer, ...all.filter(({ id, accountId }) =>
    id !== transfer.id || accountId !== transfer.accountId)]);

  return transfer;
}
