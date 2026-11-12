import type { ApiBridgeComponent, ApiBridgeOperation, ApiTransactionActivity } from '../../../types';

import { ION_BNB_MAINNET, IONCOIN } from '../../../../config';
import { getActivityChains, getActivityTokenSlugs } from '../../../../util/activities';
import { sortActivities } from '../../../../util/activities/order';
import { buildBridgeActivity, projectBridgeActivities } from './projection';

const HASH = 'ab'.repeat(32);
const OTHER_HASH = 'cd'.repeat(32);
const SENDER = '0:'.concat('11'.repeat(32));
const BRIDGE = '0:'.concat('22'.repeat(32));
const RECIPIENT = '0x'.concat('33'.repeat(20));

function component(overrides: Partial<ApiBridgeComponent> = {}): ApiBridgeComponent {
  return { chain: 'ton', role: 'source', hash: HASH, fromAddress: SENDER, toAddress: BRIDGE,
    amount: '100', token: 'native', ...overrides };
}

function operation(overrides: Partial<ApiBridgeOperation> = {}): ApiBridgeOperation {
  return { id: 'one', revision: '1', network: 'mainnet', source: 'ton', fromAddress: SENDER,
    toAddress: RECIPIENT, amount: '100', receiveAmount: '90', timestamp: 1000, status: 'waiting',
    components: [component()], fees: [], ...overrides };
}

function transaction(overrides: Partial<ApiTransactionActivity> = {}): ApiTransactionActivity {
  return { kind: 'transaction', id: 'trace:action', timestamp: 1001, amount: -100n, slug: IONCOIN.slug,
    fromAddress: SENDER, toAddress: BRIDGE, normalizedAddress: SENDER, isIncoming: false, fee: 1n,
    status: 'completed', extra: { chainTransactionHashes: [HASH] }, ...overrides };
}

it('projects a server-discovered operation on a fresh device and keeps both token histories', () => {
  const swap = buildBridgeActivity(operation());
  const projected = projectBridgeActivities([transaction(), swap]);

  expect(projected.activities.filter(({ shouldHide }) => !shouldHide)).toEqual([swap]);
  expect(projected.activities.find(({ id }) => id === 'trace:action')).toMatchObject({ shouldHide: true });
  expect(getActivityTokenSlugs(swap)).toEqual([IONCOIN.slug, ION_BNB_MAINNET.slug]);
  expect(getActivityChains(swap)).toEqual(['ton', 'bnb']);
});

it('does not fold repeated equal amounts without the exact chain transaction', () => {
  const first = transaction();
  const second = transaction({ id: 'other:action', extra: { chainTransactionHashes: [OTHER_HASH] } });
  const projected = projectBridgeActivities([first, second, buildBridgeActivity(operation())]);

  expect(projected.replacedIds).toEqual({ [first.id]: 'bridge:mainnet:one' });
  expect(projected.activities.find(({ id }) => id === second.id)?.shouldHide).toBeUndefined();
});

it('keeps ambiguous actions in the same trace and unrelated acknowledgements visible', () => {
  const first = transaction();
  const second = transaction({ id: 'trace:second' });
  const ack = transaction({ id: 'trace:ack', amount: 0n, fromAddress: BRIDGE, toAddress: SENDER, isIncoming: true });
  const projected = projectBridgeActivities([first, second, ack, buildBridgeActivity(operation())]);

  expect(projected.replacedIds).toEqual({});
});

it('distinguishes several token burns in one EVM transaction by log index', () => {
  const first = transaction({ id: `0x${HASH}:l4`, slug: ION_BNB_MAINNET.slug, fromAddress: RECIPIENT,
    toAddress: BRIDGE, extra: { chainLogIndex: 4 } });
  const second = { ...first, id: `0x${HASH}:l7`, extra: { chainLogIndex: 7 } };
  const swap = buildBridgeActivity(operation({ source: 'bnb', components: [component({ chain: 'bnb',
    hash: `0x${HASH}`, fromAddress: RECIPIENT, logIndex: 7, token: ION_BNB_MAINNET.tokenAddress })] }));
  const projected = projectBridgeActivities([first, second, swap]);

  expect(projected.replacedIds).toEqual({ [second.id]: swap.id });
});

it('requires normalized external hash proof to replace a local TON intent', () => {
  const local = transaction({ id: `${HASH}:0:local`, externalMsgHashNorm: OTHER_HASH });
  const unproven = projectBridgeActivities([local, buildBridgeActivity(operation())]);
  expect(unproven.replacedIds).toEqual({});

  const proven = projectBridgeActivities([local, buildBridgeActivity(operation({
    components: [component({ externalMsgHashNorm: OTHER_HASH })],
  }))]);
  expect(proven.replacedIds[local.id]).toBe('bridge:mainnet:one');
});

it('restores raw visibility when an operation is removed and preserves preexisting hiding', () => {
  const hidden = transaction({ id: 'hidden', shouldHide: true, amount: -1n });
  const projected = projectBridgeActivities([transaction(), hidden, buildBridgeActivity(operation())]);
  const restored = projectBridgeActivities(projected.activities.filter(({ kind }) => kind !== 'swap'));

  expect(restored.activities.find(({ id }) => id === 'trace:action')?.shouldHide).toBeUndefined();
  expect(restored.activities.find(({ id }) => id === 'hidden')?.shouldHide).toBe(true);
});

it('keeps the source timestamp order when status changes or completion arrives late', () => {
  const swap = buildBridgeActivity(operation({ status: 'claimable' }));
  const newer = transaction({ id: 'new', timestamp: 2000 });

  expect(sortActivities([swap, newer]).map(({ id }) => id)).toEqual([newer.id, swap.id]);
  expect(sortActivities([{ ...swap, status: 'completed' }, newer]).map(({ id }) => id)).toEqual([newer.id, swap.id]);
});

it('keeps a folded direct burn fee visible in the native BNB token feed', () => {
  const swap = buildBridgeActivity(operation({ source: 'bnb', fees: [
    { chain: 'bnb', payer: RECIPIENT, amount: '100', transactionHash: `0x${HASH}` },
  ] }));
  expect(getActivityTokenSlugs(swap)).toContain('bnb');
});

it('uses the testnet bridge token and preserves already canonical server operation ids', () => {
  const swap = buildBridgeActivity(operation({ id: 'bridge:testnet:ton:token:swap', network: 'testnet' }));

  expect(swap.id).toBe('bridge:testnet:ton:token:swap');
  expect(swap.toSlug).toBe('bnb-0xc632928ab4fc995e04b4d66da62c28ce56e2bd73');
});
