import type { OnApiUpdate } from '../../../types';

import { SEC } from '../../../constants';
import { getBackendConfigCacheSync } from '../../cache';
import { pollingLoop } from '../../polling/utils';

const BRIDGE_ACTIVITY_POLLING_PERIOD = { focused: 10 * SEC, notFocused: 30 * SEC };

/** Bridge progress can change while neither wallet receives a new transaction. */
export function setupBridgeActivityPolling(accountId: string, onUpdate: OnApiUpdate) {
  let isStopped = false;
  const loop = pollingLoop({
    period: BRIDGE_ACTIVITY_POLLING_PERIOD,
    poll() {
      if (isStopped || getBackendConfigCacheSync()?.isBridgeHistoryEnabled !== true) return;

      onUpdate({ type: 'newActivities', accountId, activities: [] });
    },
  });

  return () => {
    isStopped = true;
    loop.stop();
  };
}
