import type { ApiActivity, ApiNetwork } from '../../../types';

import { throwIfAborted } from '../../../../util/abortSignal';
import { logDebugError } from '../../../../util/logs';
import { fetchAndParseTrace } from '../traces';
import { TRACE_ACTIVITY_RULES } from './technicalChildRules';
import { getHiddenActivityIdsFromTrace } from './traceActivityProjection';

export async function projectActivitiesWithTraceOutputs(
  network: ApiNetwork,
  walletAddress: string,
  activities: ApiActivity[],
  signal?: AbortSignal,
): Promise<ApiActivity[]> {
  const byMessageHash = new Map<string, ApiActivity[]>();
  for (const activity of activities) {
    if (!activity.externalMsgHashNorm) continue;
    const group = byMessageHash.get(activity.externalMsgHashNorm) ?? [];
    group.push(activity);
    byMessageHash.set(activity.externalMsgHashNorm, group);
  }

  const hiddenIds = new Set<string>();
  for (const [messageHash, group] of byMessageHash) {
    if (!TRACE_ACTIVITY_RULES.some(({ shouldInspect }) => shouldInspect(group))) continue;

    try {
      const parsedTrace = await fetchAndParseTrace(network, walletAddress, messageHash, false, signal);
      if (!parsedTrace) continue;
      for (const id of getHiddenActivityIdsFromTrace(parsedTrace, TRACE_ACTIVITY_RULES)) hiddenIds.add(id);
    } catch (err) {
      throwIfAborted(signal);
      logDebugError('Failed to project TON trace activities', messageHash, err);
    }
  }

  return hiddenIds.size
    ? activities.map((activity) => hiddenIds.has(activity.id) ? { ...activity, shouldHide: true } : activity)
    : activities;
}
