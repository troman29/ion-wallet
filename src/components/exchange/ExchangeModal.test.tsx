import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { setGlobal } from '../../global';

import type { ApiBridgeQuote, ApiBridgeTransfer } from '../../api/types/bridge';

import { INITIAL_STATE } from '../../global/initialState';
import { cloneDeep } from '../../util/iteratees';
import { waitForCondition } from '../../../tests/util/async';
import { callApiWithThrow as callApi } from '../../api';

import { BridgeContent } from './ExchangeModal';

const mockRelease = jest.fn();

jest.mock('../../api', () => ({ callApiWithThrow: jest.fn() }));
jest.mock('../../global', () => ({
  ...jest.requireActual('../../global'),
  getActions: () => ({ closeExchange: jest.fn(), releaseEnclaveSession: mockRelease }),
}));
jest.mock('../../hooks/useLang', () => ({ __esModule: true, default: () => (key: string) => key }));
jest.mock('../ui/Modal', () => ({ __esModule: true, default: () => undefined }));
jest.mock('../ui/PasswordForm', () => ({
  __esModule: true,
  default: ({ onAuthorize }: { onAuthorize: (token: string) => void }) => (
    <button onClick={() => onAuthorize('authorization')}>Authorize</button>
  ),
}));
jest.mock('../ui/RichNumberInput', () => ({
  __esModule: true,
  default: ({
    id,
    value,
    disabled,
    hasError,
    onChange,
  }: {
    id: string;
    value: string;
    disabled?: boolean;
    hasError?: boolean;
    onChange?: (value: string) => void;
  }) => (
    <input
      id={id}
      value={value}
      disabled={disabled}
      aria-invalid={hasError || undefined}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
}));

const ACCOUNT_ID = '0-mainnet';
const quote: ApiBridgeQuote = {
  accountId: ACCOUNT_ID,
  source: 'ton',
  fromAddress: 'ION-SENDER',
  toAddress: 'BNB-RECIPIENT',
  amount: '10000000000',
  receiveAmount: '9500000000',
  bridgeFee: '500000000',
  networkFee: '100000000',
  balance: '100000000000',
  maxAmount: '99900000000',
  expiresAt: Date.now() + 60000,
};
let root: HTMLDivElement;
let storedTransfers: ApiBridgeTransfer[];

beforeEach(() => {
  jest.clearAllMocks();

  storedTransfers = [];
  quote.expiresAt = Date.now() + 60000;
  quote.balance = '100000000000';
  quote.maxAmount = '99900000000';
  quote.nativeBalance = quote.balance;

  root = document.createElement('div');
  document.body.append(root);

  const initial = cloneDeep(INITIAL_STATE);
  setGlobal({ ...initial, currentAccountId: ACCOUNT_ID, settings: { ...initial.settings, animationLevel: 0 } });

  jest.mocked(callApi).mockImplementation((method, ...args) => {
    if (method === 'getBridgeTransfers') return Promise.resolve(storedTransfers) as never;
    if (method === 'getBridgeQuote') {
      return Promise.resolve({
        ...quote,
        source: args[1],
        amount: args[2],
        toAddress: args[1] === 'ton' ? 'BNB-RECIPIENT' : 'ION-RECIPIENT',
      }) as never;
    }
    if (method === 'submitBridge') {
      return Promise.resolve({
        ...quote,
        id: 'sent',
        createdAt: 1,
        status: 'pending',
      }) as never;
    }
    if (method === 'getBridgeClaimFee') return Promise.resolve('30000000000000') as never;
    if (method === 'claimBridge') {
      return Promise.resolve({
        ...quote,
        id: args[1],
        createdAt: 1,
        status: 'claiming',
      }) as never;
    }

    return Promise.resolve(undefined) as never;
  });
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

it('requires an amount and disables amounts below the bridge minimum', async () => {
  await render();

  expect(getButton('Review transfer').disabled).toBe(true);

  enterAmount('9');

  await waitForCondition(() => root.textContent!.includes('Minimum bridge amount'));

  expect(getButton('Review transfer').disabled).toBe(true);
  expect(jest.mocked(callApi).mock.calls.some(([method]) => method === 'submitBridge')).toBe(false);
});

it('reviews the destination and fees before requesting authorization, then releases the session', async () => {
  await render();
  enterAmount('10');

  await waitForCondition(() => !getButton('Review transfer').disabled);
  getButton('Review transfer').click();

  await waitForCondition(() => Boolean(getButton('Continue')));

  expect(root.textContent).toContain('BNB-RECIPIENT');
  expect(root.textContent).toContain('0.5 ION');
  expect(jest.mocked(callApi).mock.calls.some(([method]) => method === 'submitBridge')).toBe(false);

  getButton('Continue').click();

  await waitForCondition(() => Boolean(getButton('Authorize')));
  getButton('Authorize').click();

  await waitForCondition(() => root.textContent!.includes('Submitting transfer'));

  expect(callApi).toHaveBeenCalledWith(
    'submitBridge', expect.objectContaining({ toAddress: 'BNB-RECIPIENT' }), 'authorization',
  );
  expect(mockRelease).toHaveBeenCalledWith({ enclaveToken: 'authorization' });
});

it('keeps a changed-fee warning above Review until the user reviews the fresh quote', async () => {
  const implementation = jest.mocked(callApi).getMockImplementation()!;
  jest.mocked(callApi).mockImplementation((method, ...args) => {
    if (method === 'submitBridge') {
      return Promise.reject(new Error('The quote changed. Please review the transfer again.')) as never;
    }

    return (implementation as (...values: unknown[]) => never)(method, ...args);
  });

  await render();
  enterAmount('10');

  await waitForCondition(() => !getButton('Review transfer').disabled);
  getButton('Review transfer').click();

  await waitForCondition(() => Boolean(getButton('Continue')));
  getButton('Continue').click();

  await waitForCondition(() => Boolean(getButton('Authorize')));
  getButton('Authorize').click();

  await waitForCondition(() => Boolean(getButton('Review transfer')) && !getButton('Review transfer').disabled);
  const warning = root.querySelector('[role="alert"]')!;

  expect(warning.textContent).toContain('The quote changed. Please review the transfer again.');
  expect(warning.parentElement).toBe(getButton('Review transfer').parentElement);
  expect(warning.compareDocumentPosition(getButton('Review transfer')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(getButton('Try Again')).toBeUndefined();

  getButton('Review transfer').click();

  await waitForCondition(() => Boolean(getButton('Continue')));

  expect(root.querySelector('[role="alert"]')).toBeNull();
});

it('rejects an amount above the balance locally and recovers after editing it', async () => {
  await render();
  await waitForCondition(() => Array.from(root.querySelectorAll('button')).some(
    (item) => item.textContent?.includes('99.9'),
  ));
  enterAmount('101');

  await waitForCondition(() => Boolean(getButton('Insufficient Balance')));

  expect(getButton('Insufficient Balance').disabled).toBe(true);
  expect(root.querySelector('#bridge-amount')?.getAttribute('aria-invalid')).toBe('true');

  await new Promise((resolve) => setTimeout(resolve, 400));

  expect(jest.mocked(callApi).mock.calls.some(([method, , , amount]) => (
    method === 'getBridgeQuote' && amount === '101000000000'
  ))).toBe(false);
  expect(root.querySelector('[role="alert"]')).toBeNull();
  expect(getButton('Try Again')).toBeUndefined();

  enterAmount('10');

  await waitForCondition(() => Boolean(getButton('Review transfer')) && !getButton('Review transfer').disabled);

  expect(root.querySelector('#bridge-amount')?.hasAttribute('aria-invalid')).toBe(false);
  expect(jest.mocked(callApi).mock.calls.some(([method]) => method === 'submitBridge')).toBe(false);
});

it('reserves the network fee and lets Max recover from an invalid amount', async () => {
  await render();
  await waitForCondition(() => Array.from(root.querySelectorAll('button')).some(
    (item) => item.textContent?.includes('99.9'),
  ));
  enterAmount('100');

  await waitForCondition(() => Boolean(getButton('Insufficient Fee')));

  expect(getButton('Insufficient Fee').disabled).toBe(true);

  const maxButton = Array.from(root.querySelectorAll('button')).find((item) => item.textContent?.startsWith('Max:'))!;
  maxButton.click();

  await waitForCondition(() => Boolean(getButton('Review transfer')) && !getButton('Review transfer').disabled);

  expect(root.querySelector<HTMLInputElement>('#bridge-amount')!.value).toBe('99.9');
  expect(getButton('Insufficient Fee')).toBeUndefined();
});

it('refreshes balance on focus and makes an amount affordable after an incoming deposit', async () => {
  await render();
  enterAmount('101');

  await waitForCondition(() => Boolean(getButton('Insufficient Balance')));
  quote.balance = '200000000000';
  quote.maxAmount = '199900000000';
  quote.nativeBalance = quote.balance;
  window.dispatchEvent(new Event('focus'));

  await waitForCondition(() => Boolean(getButton('Review transfer')) && !getButton('Review transfer').disabled);

  expect(root.querySelector('#bridge-amount')?.hasAttribute('aria-invalid')).toBe(false);
  expect(root.textContent).toContain('199.9');
});

it('re-estimates an unchanged amount when a live balance update arrives', async () => {
  await render();
  enterAmount('101');

  await waitForCondition(() => Boolean(getButton('Insufficient Balance')));
  quote.balance = '200000000000';
  quote.maxAmount = '199900000000';
  quote.nativeBalance = quote.balance;
  TeactDOM.render(
    <BridgeContent accountId={ACCOUNT_ID} isAvailable balances={{ toncoin: BigInt(quote.balance) }} />, root,
  );

  await waitForCondition(() => Boolean(getButton('Review transfer')) && !getButton('Review transfer').disabled);

  expect(root.textContent).toContain('199.9');
});

it('shows a server-side gas balance error in the disabled button instead of a retry block', async () => {
  const implementation = jest.mocked(callApi).getMockImplementation()!;
  jest.mocked(callApi).mockImplementation((method, ...args) => {
    if (method === 'getBridgeQuote' && args[2] !== '0') {
      return Promise.reject(new Error('Not enough BNB for the network fee.')) as never;
    }

    return (implementation as (...values: unknown[]) => never)(method, ...args);
  });

  await render();
  enterAmount('10');

  await waitForCondition(() => Boolean(getButton('Insufficient Fee')));

  expect(getButton('Insufficient Fee').disabled).toBe(true);
  expect(root.querySelector('[role="alert"]')).toBeNull();
  expect(getButton('Try Again')).toBeUndefined();
});

it('discards a delayed quote after changing the direction', async () => {
  let resolveQuote: (value: ApiBridgeQuote) => void;
  const defaultImplementation = jest.mocked(callApi).getMockImplementation()!;
  jest.mocked(callApi).mockImplementation((method, ...args) => {
    if (method === 'getBridgeQuote' && args[1] === 'ton' && args[2] !== '0') {
      return new Promise<ApiBridgeQuote>((resolve) => {
        resolveQuote = resolve;
      }) as never;
    }

    return (defaultImplementation as (...values: unknown[]) => never)(method, ...args);
  });

  await render();
  enterAmount('10');

  await waitForCondition(() => Boolean(resolveQuote));
  root.querySelector<HTMLButtonElement>('[aria-label="Switch bridge direction"]')!.click();

  await waitForCondition(() => root.textContent!.includes('ION-RECIPIENT'));
  resolveQuote!({ ...quote });

  await new Promise((resolve) => setTimeout(resolve, 30));

  expect(getButton('Review transfer').disabled).toBe(true);
  expect(root.textContent).not.toContain('BNB-RECIPIENT');
});

it('restores a pending transfer when reopening the bridge', async () => {
  storedTransfers = [{
    ...quote,
    id: 'existing',
    createdAt: 1,
    status: 'waiting',
    votes: 1,
    requiredVotes: 3,
  }];

  await render();
  await waitForCondition(() => root.textContent!.includes('Waiting for bridge confirmations'));

  expect(getButton('Review transfer')).toBeUndefined();
  expect(root.textContent).toContain('BNB-RECIPIENT');
  expect(root.textContent).toContain('Your bridge transfer is saved.');
});

it('reviews and authorizes a saved claim without starting another bridge transfer', async () => {
  storedTransfers = [{
    ...quote,
    id: 'existing',
    createdAt: 1,
    status: 'claimable',
  }];

  await render();
  await waitForCondition(() => Boolean(getButton('Receive ION')));
  getButton('Receive ION').click();

  await waitForCondition(() => root.textContent!.includes('Bridge fee'));
  getButton('Receive ION').click();

  await waitForCondition(() => Boolean(getButton('Authorize')));
  getButton('Authorize').click();

  await waitForCondition(() => root.textContent!.includes('Receiving ION on BNB Chain'));

  expect(callApi).toHaveBeenCalledWith('claimBridge', ACCOUNT_ID, 'existing', '30000000000000', 'authorization');
  expect(jest.mocked(callApi).mock.calls.some(([method]) => method === 'submitBridge')).toBe(false);
  expect(mockRelease).toHaveBeenCalledWith({ enclaveToken: 'authorization' });
});

it.each(['completed', 'failed'] as const)('opens a fresh form when saved transfers are %s', async (status) => {
  storedTransfers = [{
    ...quote,
    id: 'previous',
    createdAt: 1,
    status,
  }];

  await render();
  enterAmount('10');

  await waitForCondition(() => !getButton('Review transfer').disabled);

  expect(root.textContent).not.toContain('Recent bridge transfers');
  expect(root.textContent).not.toContain('ION-SENDER');
  expect(getButton('New bridge transfer')).toBeUndefined();
});

it('does not offer a signing flow for an account without both chains', async () => {
  TeactDOM.render(<BridgeContent accountId={ACCOUNT_ID} isAvailable={false} />, root);

  await waitForCondition(() => root.textContent!.includes('Bridge requires'));

  expect(getButton('Review transfer')).toBeUndefined();
  expect(callApi).not.toHaveBeenCalled();
});

it('opens the selected server operation when several bridge transfers are active', async () => {
  storedTransfers = [
    { ...quote, id: 'first', serverOperationId: 'first-operation', createdAt: 2, status: 'waiting' },
    { ...quote, id: 'second', serverOperationId: 'second-operation', createdAt: 1, status: 'claimable' },
  ];
  TeactDOM.render(<BridgeContent accountId={ACCOUNT_ID} isAvailable bridgeOperationId="second-operation" />, root);

  await waitForCondition(() => Boolean(getButton('Receive ION')));
  getButton('Receive ION').click();
  await waitForCondition(() => root.textContent!.includes('Bridge fee'));

  expect(callApi).toHaveBeenCalledWith('getBridgeClaimFee', ACCOUNT_ID, 'second');
  expect(jest.mocked(callApi).mock.calls.some(([method]) => method === 'submitBridge')).toBe(false);
});

async function render() {
  TeactDOM.render(<BridgeContent accountId={ACCOUNT_ID} isAvailable />, root);

  await waitForCondition(() => Boolean(getButton('Review transfer')) || Boolean(getButton('Refresh status')));
}

function enterAmount(value: string) {
  const input = root.querySelector<HTMLInputElement>('#bridge-amount')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function getButton(label: string) {
  return Array.from(root.querySelectorAll('button')).find((item) => item.textContent?.trim() === label)!;
}
