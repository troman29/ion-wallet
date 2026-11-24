import { Address } from '@ton/core';

import type { ApiBridgeOperation } from '../../../types';
import type { ApiBridgeTransfer } from '../../../types/bridge';

import { mergeServerBridgeTransfers } from './restore';

function operation(overrides: Partial<ApiBridgeOperation> = {}): ApiBridgeOperation {
  return { id: 'one', revision: '2', network: 'mainnet', source: 'ton', fromAddress: 'from', toAddress: 'to',
    amount: '100', receiveAmount: '90', timestamp: 1000, status: 'waiting', components: [], fees: [], ...overrides };
}

function local(overrides: Partial<ApiBridgeTransfer> = {}): ApiBridgeTransfer {
  return { accountId: '1-mainnet', id: 'local', source: 'ton', fromAddress: 'from', toAddress: 'to', amount: '100',
    receiveAmount: '90', bridgeFee: '10', networkFee: '1', balance: '1000', maxAmount: '999', expiresAt: 2000,
    createdAt: 1000, status: 'pending', ...overrides };
}

it('restores public server operations without signing data on a second device', () => {
  const [transfer] = mergeServerBridgeTransfers('1-mainnet', [], [operation()]);

  expect(transfer).toMatchObject({ id: 'bridge:mainnet:one', serverOperationId: 'one', status: 'waiting' });
  expect(transfer.signedEvmTransaction).toBeUndefined();
  expect(transfer.nativeSubmission).toBeUndefined();
});

it('merges a proven intent and preserves its authorized signing data', () => {
  const intent = local({ swapId: 'swap', nativeSubmission: { boc: 'local-only', validUntil: 2000 } });
  const [transfer] = mergeServerBridgeTransfers('1-mainnet', [intent], [operation({ swapId: 'swap' })]);

  expect(transfer.id).toBe(intent.id);
  expect(transfer.nativeSubmission).toEqual(intent.nativeSubmission);
  expect(transfer.serverRevision).toBe('2');
});

it('does not merge equal amounts and addresses or confuse an external hash with a transaction hash', () => {
  const intent = local({ txId: 'external-hash' });
  const transfers = mergeServerBridgeTransfers('1-mainnet', [intent], [operation({
    sourceTransaction: { chain: 'ton', hash: 'external-hash' },
  })]);

  expect(transfers).toHaveLength(2);
});

it('does not reuse one local intent for several burns in one EVM transaction', () => {
  const intent = local({ source: 'bnb', txId: '0xhash' });
  const operations = ['one', 'two'].map((id, logIndex) => operation({ id, source: 'bnb',
    sourceTransaction: { chain: 'bnb', hash: '0xhash', logIndex } }));
  const transfers = mergeServerBridgeTransfers('1-mainnet', [intent], operations);

  expect(new Set(transfers.map(({ id }) => id)).size).toBe(3);
  expect(transfers).toHaveLength(3);
});

it('treats server completion as authoritative and retires local signing data', () => {
  const intent = local({ serverOperationId: 'one', signedEvmTransaction: 'signed', status: 'claiming' });
  const [transfer] = mergeServerBridgeTransfers('1-mainnet', [intent], [operation({ status: 'completed' })]);

  expect(transfer.status).toBe('completed');
  expect(transfer.signedEvmTransaction).toBeUndefined();
});

it('matches friendly addresses and base64 external hashes against canonical source component evidence', () => {
  const address = new Address(0, Buffer.alloc(32, 1));
  const raw = address.toRawString();
  const hash = Buffer.alloc(32, 2);
  const intent = local({ fromAddress: address.toString(), txId: hash.toString('base64') });
  const transfers = mergeServerBridgeTransfers('1-mainnet', [intent], [operation({ fromAddress: raw,
    components: [{ role: 'source', chain: 'ton', hash: `0x${'33'.repeat(32)}`, fromAddress: raw,
      toAddress: 'bridge', amount: '100', token: 'native', externalMsgHashNorm: `0x${hash.toString('hex')}` }],
  })]);

  expect(transfers).toHaveLength(1);
  expect(transfers[0].id).toBe(intent.id);
});
