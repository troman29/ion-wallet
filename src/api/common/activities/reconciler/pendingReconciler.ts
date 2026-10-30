import type { ApiActivity } from '../../../types';

import { getIsTxIdLocal } from '../../../../util/activities';

const STATUS_RANK: Record<ApiActivity['status'], number> = {
  pending: 1,
  pendingTrusted: 2,
  confirmed: 3,
  completed: 4,
  failed: 4,
};

export function reconcileNewActivitiesUpdate(
  previousActivities: readonly ApiActivity[],
  confirmedActivities: readonly ApiActivity[],
  pendingActivities?: readonly ApiActivity[],
) {
  const incoming = Array.from(new Map(
    [...(pendingActivities ?? []), ...confirmedActivities].map((activity) => [activity.id, activity]),
  ).values());
  const replacedIds: Record<string, string> = {};
  const previousByNextId = new Map<string, ApiActivity>();
  const usedNextIds = new Set<string>();

  for (const previous of previousActivities) {
    const candidates = incoming.filter((next) => {
      if (usedNextIds.has(next.id) || next.kind !== previous.kind) return false;
      return next.id === previous.id || Boolean(
        previous.externalMsgHashNorm
        && previous.externalMsgHashNorm === next.externalMsgHashNorm
        && !getIsTxIdLocal(next.id)
        && (previous.type !== 'unstakeRequest' || next.type === 'unstakeRequest'),
      );
    });
    const direct = candidates.find(({ id }) => id === previous.id);
    const visible = candidates.filter(({ shouldHide }) => shouldHide !== true);
    const match = direct ?? (visible.length === 1 ? visible[0] : undefined);
    if (!match) continue;

    replacedIds[previous.id] = match.id;
    previousByNextId.set(match.id, previous);
    usedNextIds.add(match.id);
  }

  const preserveStatus = (activity: ApiActivity) => {
    const previous = previousByNextId.get(activity.id);
    return previous && STATUS_RANK[previous.status] > STATUS_RANK[activity.status]
      ? { ...activity, status: previous.status }
      : activity;
  };
  const reconciledConfirmed = confirmedActivities.map(preserveStatus);
  const reconciledPending = pendingActivities?.map(preserveStatus);

  return {
    confirmedActivities: reconciledConfirmed,
    pendingActivities: reconciledPending,
    patch: {
      upsert: [...(reconciledPending ?? []), ...reconciledConfirmed],
      removeIds: Object.entries(replacedIds)
        .filter(([previousId, nextId]) => previousId !== nextId)
        .map(([previousId]) => previousId),
      replacedIds,
    },
  };
}
