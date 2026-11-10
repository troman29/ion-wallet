import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { setGlobal } from '../../global';

import type { ApiDappTransfer } from '../../api/types';
import { TransferState } from '../../global/types';

import { BNB } from '../../config';
import { INITIAL_STATE } from '../../global/initialState';
import { cloneDeep } from '../../util/iteratees';
import { waitForCondition } from '../../../tests/util/async';

import DappTransferInitial from './DappTransferInitial';

const mockConfirm = jest.fn();

jest.mock('../../hooks/useLang', () => ({
  __esModule: true,
  default: () => (key: string) => key,
}));

jest.mock('../../global', () => ({
  ...jest.requireActual('../../global'),
  getActions: () => ({
    closeDappTransfer: jest.fn(),
    submitDappTransferConfirm: mockConfirm,
  }),
}));

const CONTRACT = '0x2222222222222222222222222222222222222222';
const transfer: ApiDappTransfer = {
  chain: 'bnb', toAddress: CONTRACT, displayedToAddress: CONTRACT, normalizedAddress: CONTRACT,
  amount: 1_000_000_000_000_000_000n, networkFee: 180_000_000_000_000n, isDangerous: true,
  evmPreview: { data: '0xdeadbeef12345678', maximumFee: 180_000_000_000_000n },
};

let root: HTMLDivElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  mockConfirm.mockClear();
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

async function renderConfirmation(transaction = transfer, balance = 10n ** 20n, isSignOnly = false) {
  setGlobal({
    ...cloneDeep(INITIAL_STATE),
    currentAccountId: '0-mainnet',
    byAccountId: { '0-mainnet': { balances: { bySlug: { [BNB.slug]: balance } } } },
    currentDappTransfer: {
      state: TransferState.Initial,
      operationChain: 'bnb',
      transactions: [transaction],
      isSignOnly,
      shouldHideTransfers: true,
      dapp: { name: 'Bridge', url: 'https://bridge.example', iconUrl: '', connectedAt: 0 },
    },
  });
  TeactDOM.render(<DappTransferInitial />, root);
  const submitLabel = isSignOnly ? 'Sign' : 'Send';
  await waitForCondition(() => Array.from(root.querySelectorAll('button'))
    .some((button) => button.textContent === submitLabel));
  return Array.from(root.querySelectorAll('button')).find((button) => button.textContent === submitLabel)!;
}

it('keeps EVM details visible when generic transfers are hidden and emulation is absent', async () => {
  const submit = await renderConfirmation();

  expect(root.textContent).toContain(CONTRACT);
  expect(root.textContent).toContain('Amount1 BNB');
  expect(root.textContent).toContain('Method ID0xdeadbeef');
  expect(root.textContent).toContain('Call Data0xdeadbeef12345678');
  expect(root.textContent).toContain('Maximum Fee0.00018 BNB');
  expect(submit.disabled).toBe(false);
  submit.click();
  expect(mockConfirm).toHaveBeenCalledTimes(1);
});

it('disables confirmation when the EVM transaction cannot be read', async () => {
  const submit = await renderConfirmation({ ...transfer, evmPreview: undefined });

  expect(root.textContent).toContain('Unable to read transaction details.');
  expect(submit.disabled).toBe(true);
  submit.click();
  expect(mockConfirm).not.toHaveBeenCalled();
});

it('includes the native value and fee in the balance required for confirmation', async () => {
  const submit = await renderConfirmation(transfer, transfer.amount);

  expect(submit.disabled).toBe(true);
  submit.click();
  expect(mockConfirm).not.toHaveBeenCalled();
});

it('allows sign-only confirmation with a zero balance and keeps the transaction details', async () => {
  const submit = await renderConfirmation(transfer, 0n, true);

  expect(root.textContent).toContain('Amount1 BNB');
  expect(root.textContent).toContain('Maximum Fee0.00018 BNB');
  expect(root.textContent).not.toContain('Not Enough');
  expect(submit.textContent).toBe('Sign');
  expect(submit.disabled).toBe(false);
  submit.click();
  expect(mockConfirm).toHaveBeenCalledTimes(1);
});

it('still blocks unreadable transactions in sign-only mode', async () => {
  const submit = await renderConfirmation({ ...transfer, evmPreview: undefined }, 0n, true);

  expect(root.textContent).toContain('Unable to read transaction details.');
  expect(submit.disabled).toBe(true);
  submit.click();
  expect(mockConfirm).not.toHaveBeenCalled();
});
