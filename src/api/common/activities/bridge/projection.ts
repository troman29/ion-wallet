import { Address } from '@ton/core';

import type {
  ApiActivity, ApiBridgeComponent, ApiBridgeOperation, ApiSwapActivity, ApiTransactionActivity,
} from '../../../types';

import { IONCOIN } from '../../../../config';
import { getIsTxIdLocal, parseTxId } from '../../../../util/activities';
import { BRIDGE_CONFIG } from '../../../bridge/config';

export function getBridgeActivityId(id: string, network: ApiBridgeOperation['network']) {
  return id.startsWith(`bridge:${network}:`) ? id : `bridge:${network}:${id}`;
}

export function buildBridgeActivity(operation: ApiBridgeOperation): ApiSwapActivity {
  const bridgedSlug = `bnb-${BRIDGE_CONFIG[operation.network].token}`;

  return {
    id: getBridgeActivityId(operation.id, operation.network),
    kind: 'swap',
    provider: 'ion-bridge',
    operation,
    timestamp: operation.timestamp,
    status: operation.status,
    fromSlug: operation.source === 'ton' ? IONCOIN.slug : bridgedSlug,
    toSlug: operation.source === 'ton' ? bridgedSlug : IONCOIN.slug,
    shouldLoadDetails: true,
  };
}

/** Restores the raw rows before applying current evidence, so removals and reorgs can reveal them again. */
export function projectBridgeActivities(activities: readonly ApiActivity[]) {
  const restored: ApiActivity[] = activities.map((activity) => {
    if (!activity.extra?.bridgeProjection) return activity;

    const { bridgeProjection, ...extra } = activity.extra;
    return { ...activity, shouldHide: bridgeProjection.wasHidden, extra };
  });
  const transactions = restored.filter((activity): activity is ApiTransactionActivity =>
    activity.kind === 'transaction');
  const swaps = restored.filter((activity): activity is ApiSwapActivity => activity.kind === 'swap');
  const owners = new Map<string, Set<string>>();
  const candidatesByEvidence = new Map<string, ApiTransactionActivity[]>();

  for (const transaction of transactions) {
    const chain = transaction.slug === IONCOIN.slug ? 'ton' : 'bnb';
    const keys = getIsTxIdLocal(transaction.id)
      ? [`local:${chain}:${normalizeHash(transaction.externalMsgHashNorm ?? '')}`]
      : chain === 'bnb'
        ? [`bnb:${normalizeHash(parseTxId(transaction.id).hash)}:${transaction.slug === 'bnb'
          ? 'native' : transaction.extra?.chainLogIndex}`]
        : transaction.extra?.chainTransactionHashes?.map((hash) => `ton:${normalizeHash(hash)}`) ?? [];
    for (const key of new Set(keys)) {
      const candidates = candidatesByEvidence.get(key) ?? [];
      candidates.push(transaction);
      candidatesByEvidence.set(key, candidates);
    }
  }

  for (const swap of swaps) {
    for (const component of swap.operation.components) {
      const key = `${component.chain}:${normalizeHash(component.hash)}`
        + (component.chain === 'bnb' ? `:${component.token === 'native' ? 'native' : component.logIndex}` : '');
      const localKey = `local:${component.chain}:${normalizeHash(component.externalMsgHashNorm ?? '')}`;
      const candidates = [...candidatesByEvidence.get(key) ?? [], ...candidatesByEvidence.get(localKey) ?? []]
        .filter((transaction) => matchesBridgeComponent(transaction, component));
      // One component cannot explain several actions of a trace or several identical local intents.
      if (candidates.length !== 1) continue;

      const id = candidates[0].id;
      const ids = owners.get(id) ?? new Set<string>();
      ids.add(swap.id);
      owners.set(id, ids);
    }
  }

  const replacedIds: Record<string, string> = {};
  const projected: ApiActivity[] = restored.map((activity) => {
    const ids = owners.get(activity.id);
    if (ids?.size !== 1) return activity;

    const [operationId] = ids;
    replacedIds[activity.id] = operationId;
    return {
      ...activity,
      shouldHide: true,
      extra: {
        ...activity.extra,
        bridgeProjection: { operationId, wasHidden: activity.shouldHide },
      },
    };
  });

  return { activities: projected, replacedIds };
}

export function matchesBridgeComponent(transaction: ApiTransactionActivity, component: ApiBridgeComponent) {
  if (!matchesBridgeComponentSide(transaction, component)) return false;

  const chain = component.chain;
  if (getIsTxIdLocal(transaction.id)) {
    // A TON normalized external message identifies a signed intent, never an on-chain transaction.
    return Boolean(component.externalMsgHashNorm && transaction.externalMsgHashNorm
      && normalizeHash(component.externalMsgHashNorm) === normalizeHash(transaction.externalMsgHashNorm));
  }

  if (chain === 'bnb') {
    return (transaction.slug === 'bnb'
      ? transaction.id.endsWith(':t0') && component.token === 'native' && component.logIndex === undefined
      : component.logIndex !== undefined && transaction.extra?.chainLogIndex === component.logIndex)
    && normalizeHash(parseTxId(transaction.id).hash) === normalizeHash(component.hash);
  }

  return transaction.extra?.chainTransactionHashes?.some((hash) =>
    normalizeHash(hash) === normalizeHash(component.hash)) ?? false;
}

/** Side matching selects hydration candidates and never establishes component membership. */
export function matchesBridgeComponentSide(transaction: ApiTransactionActivity, component: ApiBridgeComponent) {
  const chain = transaction.slug === IONCOIN.slug
    ? 'ton' : transaction.slug === 'bnb' || transaction.slug.startsWith('bnb-') ? 'bnb' : undefined;
  if (chain !== component.chain || component.amount === undefined || !/^\d+$/.test(component.amount)
    || !component.fromAddress || !component.toAddress) {
    return false;
  }

  if (
    normalizeAddress(transaction.fromAddress, chain) !== normalizeAddress(component.fromAddress, chain)
    || normalizeAddress(transaction.toAddress, chain) !== normalizeAddress(component.toAddress, chain)
    || absolute(transaction.amount) !== BigInt(component.amount)
    || !matchesToken(transaction.slug, component)
  ) {
    return false;
  }

  return true;
}

function matchesToken(slug: string, component: ApiBridgeComponent) {
  if (!component.token) return false;

  return component.chain === 'ton'
    ? slug === IONCOIN.slug && ['native', 'ion', 'ioncoin'].includes(component.token.toLowerCase())
    : component.token === 'native' ? slug === 'bnb' : slug.toLowerCase() === `bnb-${component.token.toLowerCase()}`;
}

function normalizeAddress(address: string, chain: 'ton' | 'bnb') {
  if (chain === 'bnb') return address.toLowerCase();

  try {
    return Address.parse(address).toRawString();
  } catch {
    return address;
  }
}

function normalizeHash(hash: string) {
  const hex = hash.replace(/^0x/, '');
  return /^[\da-f]{64}$/i.test(hex) ? hex.toLowerCase() : Buffer.from(hash, 'base64').toString('hex');
}

function absolute(amount: bigint) {
  return amount < 0n ? -amount : amount;
}
