import type { TraceActivityRule } from './traceActivityProjection';

import { JettonOpCode } from '../constants';

export const TRACE_ACTIVITY_RULES: TraceActivityRule[] = [{
  shouldInspect: (activities) => activities.length > 1
    && activities.some((activity) => activity.kind === 'transaction'
      && activity.type === 'unstakeRequest' && activity.status === 'failed'),
  isTechnicalChild: ({ action: primary }, { action: child }) => {
    if (primary.type !== 'stake_withdrawal_request' || primary.success || child.type !== 'call_contract') {
      return false;
    }

    return child.details.destination === primary.details.stake_holder
      && [JettonOpCode.TransferNotification, JettonOpCode.Excesses].includes(Number(child.details.opcode));
  },
}];
