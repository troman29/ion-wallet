import { Transaction, Wallet } from 'ethers';

import { ApiTransactionError } from '../../types';

import { fetchPrivateKeyString, getSignerFromPrivateKey } from './auth';
import { signTransfer } from './sign';

jest.mock('./auth', () => ({
  fetchPrivateKeyString: jest.fn(),
  getSignerFromPrivateKey: jest.fn(),
}));

const PRIVATE_KEY = `0x${'11'.repeat(32)}`;
const RECIPIENT = '0x2222222222222222222222222222222222222222';

function serialize(chainId: number) {
  return Transaction.from({
    type: 0, chainId, to: RECIPIENT, value: 10n ** 18n, gasLimit: 21_000n, gasPrice: 3_000_000_000n,
  }).unsignedSerialized;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchPrivateKeyString).mockResolvedValue(PRIVATE_KEY);
  jest.mocked(getSignerFromPrivateKey).mockReturnValue(new Wallet(PRIVATE_KEY));
});

it.each([0, 1, 97])('rejects chainId %s before accessing a mainnet signing key', async (chainId) => {
  const result = await signTransfer('bnb', '0-mainnet', serialize(chainId), 'test-token');

  expect(result).toEqual({ error: ApiTransactionError.WrongNetwork });
  expect(fetchPrivateKeyString).not.toHaveBeenCalled();
  expect(getSignerFromPrivateKey).not.toHaveBeenCalled();
});

it('rejects a mainnet transaction for a testnet account', async () => {
  const result = await signTransfer('bnb', '0-testnet', serialize(56), 'test-token');

  expect(result).toEqual({ error: ApiTransactionError.WrongNetwork });
  expect(fetchPrivateKeyString).not.toHaveBeenCalled();
});

it.each([
  { accountId: '0-mainnet', chainId: 56 },
  { accountId: '0-testnet', chainId: 97 },
])('signs a matching transaction offline for $accountId', async ({ accountId, chainId }) => {
  const result = await signTransfer('bnb', accountId, serialize(chainId), 'test-token');

  expect(Array.isArray(result)).toBe(true);
  if (!Array.isArray(result)) throw new Error('Expected signed transaction');

  const signed = Transaction.from(result[0].payload.signedTx);
  expect(signed.chainId).toBe(BigInt(chainId));
  expect(signed.to).toBe(RECIPIENT);
  expect(signed.value).toBe(10n ** 18n);
  expect(signed.from).toBe(new Wallet(PRIVATE_KEY).address);
});
