import type { StoredDappsState } from '../dappProtocols/storage';
import type {
  ApiActivity,
  ApiLocalTransactionParams,
  ApiTransactionActivity,
  OnApiUpdate,
} from '../types';
import { DappProtocolType } from '../dappProtocols/types';

import { buildLocalTxId } from '../../util/activities';
import { EVM_JS_BRIDGE_ID } from '../../util/getDappConnectionUniqueId';
import { logDebugError } from '../../util/logs';
import { storage } from '../storages';
import {
  checkHasScamLink,
  checkHasTelegramBotMention,
  getKnownAddresses,
  getScamMarkers,
} from './addresses';

const ACTUAL_STATE_VERSION = 24;

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
 * Compares the stored `stateVersion` with the one this build expects, runs the steps in between and
 * stamps the new version. Every step must be safe to run again, since a crash before the stamp repeats it.
 */
export async function migrateStorage() {
  const version = Number(await storage.getItem('stateVersion', true));

  if (version === ACTUAL_STATE_VERSION) {
    return;
  }

  if (version < 24) {
    await moveInjectedEvmConnections();
  }

  await storage.setItem('stateVersion', ACTUAL_STATE_VERSION);
}

/** The injected EVM connections used to share the TonConnect key in the in-app browser and now have their own */
async function moveInjectedEvmConnections() {
  const dapps = await storage.getItem('dapps') as StoredDappsState | undefined;
  if (!dapps) return;

  let isChanged = false;
  for (const byUrl of Object.values(dapps)) {
    for (const byId of Object.values(byUrl)) {
      const connection = byId.jsbridge;
      if (connection?.protocolType !== DappProtocolType.WalletConnect) continue;

      byId[EVM_JS_BRIDGE_ID] ??= connection;
      delete byId.jsbridge;
      isChanged = true;
    }
  }

  if (isChanged) {
    await storage.setItem('dapps', dapps);
  }
}
