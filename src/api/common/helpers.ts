import type {
  ApiActivity,
  ApiLocalTransactionParams,
  ApiTransactionActivity,
  OnApiUpdate,
} from '../types';

import { buildLocalTxId } from '../../util/activities';
import { logDebugError } from '../../util/logs';
import { storage } from '../storages';
import {
  checkHasScamLink,
  checkHasTelegramBotMention,
  getKnownAddresses,
  getScamMarkers,
} from './addresses';

const ACTUAL_STATE_VERSION = 23;

export function buildLocalTransaction(
  params: ApiLocalTransactionParams,
  normalizedAddress: string,
  subId?: number,
): ApiTransactionActivity {
  const id = buildLocalTxId(params.id, subId);

  return updateActivityMetadata({
    // Local transactions are trusted pending
    status: 'pendingTrusted',
    kind: 'transaction',
    timestamp: Date.now(),
    isIncoming: false,
    normalizedAddress,
    ...params,
    amount: -params.amount,
    id,
  });
}

export function updateActivityMetadata<T extends ApiActivity>(activity: T): T {
  if (activity.kind !== 'transaction') {
    return activity;
  }

  const {
    normalizedAddress, comment, isIncoming, type, nft, status, isScam,
  } = activity;
  let { metadata = {} } = activity;
  const knownAddresses = getKnownAddresses();
  const hasScamMarkers = comment ? getScamMarkers().some((sm) => sm.test(comment)) : false;
  const isBounced = type === 'bounced';
  const isNft = Boolean(nft);
  const shouldCheckComment = !hasScamMarkers && comment && (isIncoming || isBounced)
    && (isNft || comment.toLowerCase().includes('claim') || isBounced || status === 'failed');
  const hasScamInComment = shouldCheckComment
    ? (checkHasScamLink(comment) || checkHasTelegramBotMention(comment))
    : false;

  if (normalizedAddress in knownAddresses) {
    metadata = { ...metadata, ...knownAddresses[normalizedAddress] };
  }

  if (hasScamMarkers || hasScamInComment || isScam) {
    metadata.isScam = true;
  }

  return { ...activity, metadata };
}

let currentOnUpdate: OnApiUpdate | undefined;

export function connectUpdater(onUpdate: OnApiUpdate) {
  currentOnUpdate = onUpdate;
}

export function disconnectUpdater() {
  currentOnUpdate = undefined;
}

export function isUpdaterAlive(onUpdate: OnApiUpdate) {
  return currentOnUpdate === onUpdate;
}

export async function tryMigrateStorage(onUpdate: OnApiUpdate) {
  try {
    return await migrateStorage();
  } catch (err) {
    logDebugError('Migration error', err);
    onUpdate?.({
      type: 'showError',
      error: 'Migration error',
    });
  }
}

/**
 * The hook every future storage migration hangs off: it compares the stored `stateVersion` with the one
 * this build expects and stamps it when they differ. There is nothing to migrate yet — this app has no
 * released version whose storage would need converting — so the body is only that bookkeeping.
 */
export async function migrateStorage() {
  const version = Number(await storage.getItem('stateVersion', true));

  if (version === ACTUAL_STATE_VERSION) {
    return;
  }

  await storage.setItem('stateVersion', ACTUAL_STATE_VERSION);
}
