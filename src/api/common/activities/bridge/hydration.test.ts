import type { ApiBridgeOperation, ApiTransactionActivity } from '../../../types';

import { IONCOIN } from '../../../../config';
import { hydrateBridgeActivityEvidence } from './hydration';
import { buildBridgeActivity, projectBridgeActivities } from './projection';

const HASH = 'ab'.repeat(32);
let accountNumber = 1000;

function transaction(id = 'trace:action'): ApiTransactionActivity {
  return { id, kind: 'transaction', timestamp: 1000, slug: IONCOIN.slug, amount: -100n,
    fromAddress: 'sender', toAddress: 'bridge', normalizedAddress: 'sender', fee: 1n, isIncoming: false,
    externalMsgHashNorm: 'external-message', status: 'completed' };
}

function swap() {
  const operation: ApiBridgeOperation = { id: 'swap', revision: '1', network: 'mainnet', source: 'ton',
    fromAddress: 'sender', toAddress: 'recipient', amount: '100', receiveAmount: '90', timestamp: 999,
    status: 'completed', fees: [], components: [{ chain: 'ton', role: 'source', hash: HASH,
      fromAddress: 'sender', toAddress: 'bridge', amount: '100', token: 'native' }] };

  return buildBridgeActivity(operation);
}

beforeEach(() => {
  accountNumber++;
});

it('hydrates legacy cached actions before folding exact transaction membership', async () => {
  const raw = transaction();
  const operation = swap();
  expect(projectBridgeActivities([raw, operation]).replacedIds).toEqual({});
  const fetchDetails = jest.fn((activity: ApiTransactionActivity) => Promise.resolve({
    ...activity, extra: { chainTransactionHashes: [HASH] },
  }));
  const hydrated = await hydrateBridgeActivityEvidence(`${accountNumber}-mainnet`, [raw], [operation], fetchDetails);
  const projected = projectBridgeActivities([...hydrated, operation]);

  expect(projected.activities.filter(({ shouldHide }) => !shouldHide)).toEqual([operation]);
  expect(projected.activities.find(({ id }) => id === raw.id)).toMatchObject({ shouldHide: true });
});

it('does not hide a side-matching cached transfer with unrelated exact transaction evidence', async () => {
  const raw = transaction();
  const operation = swap();
  const hydrated = await hydrateBridgeActivityEvidence(`${accountNumber}-mainnet`, [raw], [operation],
    (activity) => Promise.resolve({ ...activity, extra: { chainTransactionHashes: ['cd'.repeat(32)] } }));

  expect(projectBridgeActivities([...hydrated, operation]).replacedIds).toEqual({});
});

it('keeps pending/local intents and existing evidence away from hydration', async () => {
  const fetchDetails = jest.fn();
  await hydrateBridgeActivityEvidence(`${accountNumber}-mainnet`, [
    { ...transaction('local:0:local'), status: 'pendingTrusted' },
    { ...transaction('trace:pending'), status: 'pending' },
    { ...transaction('trace:known'), extra: { chainTransactionHashes: [HASH] } },
  ], [swap()], fetchDetails);

  expect(fetchDetails).not.toHaveBeenCalled();
});

it('bounds each update and backs off failed or incomplete detail reads', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(100_000);
  const accountId = `${accountNumber}-mainnet`;
  const rows = Array.from({ length: 5 }, (_, index) => transaction(`trace:${index}`));
  const fetchDetails = jest.fn(() => Promise.resolve(undefined));
  expect(await hydrateBridgeActivityEvidence(accountId, rows, [swap()], fetchDetails)).toEqual([]);
  expect(fetchDetails).toHaveBeenCalledTimes(3);
  await hydrateBridgeActivityEvidence(accountId, rows, [swap()], fetchDetails);
  expect(fetchDetails).toHaveBeenCalledTimes(5);
  await hydrateBridgeActivityEvidence(accountId, rows, [swap()], fetchDetails);
  expect(fetchDetails).toHaveBeenCalledTimes(5);
  now.mockReturnValue(131_000);
  await hydrateBridgeActivityEvidence(accountId, rows, [swap()], fetchDetails);
  expect(fetchDetails).toHaveBeenCalledTimes(8);
  now.mockRestore();
});

it('deduplicates concurrent requests and scopes them to each account', async () => {
  let finish: (value: ApiTransactionActivity) => void;
  const fetchDetails = jest.fn(() => new Promise<ApiTransactionActivity>((resolve) => {
    finish = resolve;
  }));
  const raw = transaction();
  const accountId = `${accountNumber}-mainnet`;
  const first = hydrateBridgeActivityEvidence(accountId, [raw], [swap()], fetchDetails);
  const second = hydrateBridgeActivityEvidence(accountId, [raw], [swap()], fetchDetails);
  expect(fetchDetails).toHaveBeenCalledTimes(1);
  finish!({ ...raw, extra: { chainTransactionHashes: [HASH] } });
  await Promise.all([first, second]);

  const anotherAccount = jest.fn(() => Promise.resolve({ ...raw, extra: { chainTransactionHashes: [HASH] } }));
  await hydrateBridgeActivityEvidence(`${accountNumber + 100}-mainnet`, [raw], [swap()], anotherAccount);
  expect(anotherAccount).toHaveBeenCalledTimes(1);
});
