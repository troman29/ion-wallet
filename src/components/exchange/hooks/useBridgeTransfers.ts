import { useEffect, useState } from '../../../lib/teact/teact';

import type { ApiBridgeTransfer } from '../../../api/types/bridge';

import { logDebugError } from '../../../util/logs';
import { callApiWithThrow as callApi } from '../../../api';

import useLastCallback from '../../../hooks/useLastCallback';

const STATUS_REFRESH_INTERVAL_MS = 5000;

export default function useBridgeTransfers(
  accountId: string | undefined,
  isAvailable: boolean,
  refreshKey: number,
  onRestore: (transfer: ApiBridgeTransfer) => void,
  onError: (message: string) => void,
  bridgeOperationId?: string,
) {
  const [transfers, setTransfers] = useState<ApiBridgeTransfer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const applyTransfers = useLastCallback((items: ApiBridgeTransfer[]) => {
    setTransfers(items);
    setIsLoaded(true);

    const active = bridgeOperationId
      ? items.find((transfer) => transfer.serverOperationId === bridgeOperationId || transfer.id === bridgeOperationId)
      : items.find(({ status }) => status !== 'completed' && status !== 'failed');
    if (active) onRestore(active);
  });

  useEffect(() => {
    if (!accountId || !isAvailable) return undefined;

    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const items = await callApi('getBridgeTransfers', accountId!, true, bridgeOperationId);
        if (!isCancelled) applyTransfers(items);
      } catch (err) {
        logDebugError('bridge.pollTransfers', err);
        if (!isCancelled) onError('Unable to refresh the bridge. Your transfer is saved.');
      } finally {
        if (!isCancelled) timer = setTimeout(poll, STATUS_REFRESH_INTERVAL_MS);
      }
    }

    // Local progress remains available during RPC outages
    callApi('getBridgeTransfers', accountId, false, bridgeOperationId)
      .then((items) => {
        if (!isCancelled) applyTransfers(items);
      })
      .catch((err) => logDebugError('bridge.restoreTransfers', err))
      .finally(() => {
        if (!isCancelled) void poll();
      });

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [accountId, isAvailable, refreshKey, applyTransfers, onError, bridgeOperationId]);

  const updateTransfer = useLastCallback((transfer: ApiBridgeTransfer) => {
    setTransfers((current) => [transfer, ...current.filter(({ id }) => id !== transfer.id)]);
  });

  return { transfers, isLoaded, updateTransfer };
}
