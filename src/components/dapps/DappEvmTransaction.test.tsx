import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';

import type { ApiDappTransfer } from '../../api/types';

import { waitForCondition } from '../../../tests/util/async';

import DappEvmTransaction from './DappEvmTransaction';

jest.mock('../../hooks/useLang', () => ({
  __esModule: true,
  default: () => (key: string) => key,
}));

const CONTRACT = '0x2222222222222222222222222222222222222222';
const transfer: ApiDappTransfer = {
  chain: 'bnb', toAddress: CONTRACT, displayedToAddress: CONTRACT, normalizedAddress: CONTRACT,
  amount: 1_234_567_890_123_456_789n, networkFee: 180_000_000_000_000n, isDangerous: true,
  evmPreview: { data: '0xdeadbeef12345678', maximumFee: 180_000_000_000_000n },
};

let root: HTMLDivElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

async function renderTransaction(transaction: ApiDappTransfer) {
  TeactDOM.render(<DappEvmTransaction transaction={transaction} />, root);
  await waitForCondition(() => Boolean(root.textContent));
  return root.textContent!;
}

it('shows the full contract, native value, method selector, calldata and maximum fee', async () => {
  const text = await renderTransaction(transfer);

  expect(text).toContain(`Contract Address${CONTRACT}`);
  expect(text).toContain('Amount1.234567890123456789 BNB');
  expect(text).toContain('Method ID0xdeadbeef');
  expect(text).toContain('Call Data0xdeadbeef12345678');
  expect(text).toContain('Maximum Fee0.00018 BNB');
  expect(text).not.toContain('ION');
});

it('shows a recipient for native transfers and preserves even one wei', async () => {
  const text = await renderTransaction({ ...transfer, amount: 1n, evmPreview: { data: '0x', maximumFee: 0n } });

  expect(text).toContain(`Recipient Address${CONTRACT}`);
  expect(text).toContain('Amount0.000000000000000001 BNB');
  expect(text).toContain('Maximum Fee0 BNB');
  expect(text).not.toContain('Method ID');
});

it('labels an RPC fee estimate separately from a serialized maximum', async () => {
  const text = await renderTransaction({ ...transfer, evmPreview: { data: '0xdeadbeef' } });

  expect(text).toContain('Estimated Fee0.00018 BNB');
  expect(text).not.toContain('Maximum Fee');
});

it('shows unavailable fees explicitly', async () => {
  const text = await renderTransaction({ ...transfer, networkFee: 0n, evmPreview: { data: '0xdeadbeef' } });

  expect(text).toContain('Fee unavailable');
  expect(text).not.toContain('0 BNB');
});

it('does not interpret deployment bytecode as a method selector', async () => {
  const text = await renderTransaction({ ...transfer, displayedToAddress: '' });

  expect(text).toContain('Deploying Contract');
  expect(text).toContain('Call Data0xdeadbeef12345678');
  expect(text).not.toContain('Method ID');
});

it('shows an error instead of fabricated values for unreadable transactions', async () => {
  const text = await renderTransaction({ ...transfer, evmPreview: undefined });

  expect(text).toBe('Unable to read transaction details.');
});
