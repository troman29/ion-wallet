import type { ApiActivity, ApiSwapActivity, ApiTransactionActivity } from '../../../types';

import { getActivityChains, getIsActivityPending, getIsTxIdLocal } from '../../../../util/activities';
import { matchesBridgeComponentSide } from './projection';

const MAX_HYDRATIONS_PER_UPDATE = 3;
const HYDRATION_RETRY_DELAY_MS = 30_000;

type FetchDetails = (activity: ApiTransactionActivity) => Promise<ApiActivity | undefined>;
const inFlightByKey = new Map<string, Promise<string[] | undefined>>();
const retryAtByKey = new Map<string, number>();

/** Cached action ids are re-read before their transaction evidence is used for projection. */
export async function hydrateBridgeActivityEvidence(
  accountId: string,
  activities: readonly ApiActivity[],
  swaps: readonly ApiSwapActivity[],
  fetchDetails: FetchDetails,
): Promise<ApiTransactionActivity[]> {
  const now = Date.now();
  for (const [key, retryAt] of retryAtByKey) {
    if (retryAt <= now) retryAtByKey.delete(key);
  }

  const components = swaps.flatMap(({ operation }) => operation.components).filter(({ chain }) => chain === 'ton');
  const candidates = activities.filter((activity): activity is ApiTransactionActivity =>
    activity.kind === 'transaction' && getActivityChains(activity)[0] === 'ton'
    && !getIsTxIdLocal(activity.id) && !getIsActivityPending(activity)
    && Boolean(activity.externalMsgHashNorm) && activity.extra?.chainTransactionHashes === undefined
    && components.some((component) => matchesBridgeComponentSide(activity, component)));
  const requested = candidates.filter((activity) => {
    const key = getHydrationKey(accountId, activity);

    return inFlightByKey.has(key) || (retryAtByKey.get(key) ?? 0) <= Date.now();
  }).slice(0, MAX_HYDRATIONS_PER_UPDATE);

  const settled = await Promise.allSettled(requested.map(async (activity) => {
    const key = getHydrationKey(accountId, activity);
    let request = inFlightByKey.get(key);
    if (!request) {
      request = fetchEvidence(activity, fetchDetails);
      inFlightByKey.set(key, request);
    }

    const hashes = await request;
    if (inFlightByKey.get(key) === request) inFlightByKey.delete(key);
    retryAtByKey.set(key, Date.now() + HYDRATION_RETRY_DELAY_MS);

    return hashes?.length ? {
      ...activity,
      extra: { ...activity.extra, chainTransactionHashes: hashes },
    } : undefined;
  }));

  return settled.flatMap((result) =>
    result.status === 'fulfilled' && result.value ? [result.value] : []);
}

function getHydrationKey(accountId: string, activity: ApiTransactionActivity) {
  return JSON.stringify([
    accountId, activity.id, activity.fromAddress, activity.toAddress, activity.externalMsgHashNorm,
  ]);
}

async function fetchEvidence(activity: ApiTransactionActivity, fetchDetails: FetchDetails) {
  try {
    const details = await fetchDetails(activity);

    return details?.kind === 'transaction' && details.id === activity.id
      ? details.extra?.chainTransactionHashes : undefined;
  } catch {
    return undefined;
  }
}
