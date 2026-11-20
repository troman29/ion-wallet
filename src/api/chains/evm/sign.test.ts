import { Transaction, Wallet } from 'ethers';

import { ApiTransactionError } from '../../types';

import { fetchPrivateKeyString, getSignerFromPrivateKey } from './auth';
import { signPayload, signTransfer } from './sign';

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

// ── signTransfer ──────────────────────────────────────────────────────────────

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

// ── signPayload (EIP-712 domain.chainId) ──────────────────────────────────────

describe('signPayload EIP-712 domain.chainId validation', () => {
  const baseTypes = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
    ],
    Transfer: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  };
  const baseMessage = { to: RECIPIENT, amount: '1000000000000000000' };

  it('rejects EIP-712 data with a cross-chain domain.chainId before accessing the key', async () => {
    // Connected to BNB mainnet (56) but domain claims Ethereum mainnet (1)
    const result = await signPayload('bnb', '0-mainnet', {
      type: 'eip712',
      domain: { name: 'MyProtocol', chainId: 1 },
      types: baseTypes,
      primaryType: 'Transfer',
      message: baseMessage,
    }, 'test-token');

    expect(result).toEqual({ error: ApiTransactionError.WrongNetwork });
    expect(fetchPrivateKeyString).not.toHaveBeenCalled();
  });

  it('rejects EIP-712 data whose chainId does not match the testnet account', async () => {
    const result = await signPayload('bnb', '0-testnet', {
      type: 'eip712',
      domain: { name: 'MyProtocol', chainId: 56 },
      types: baseTypes,
      primaryType: 'Transfer',
      message: baseMessage,
    }, 'test-token');

    expect(result).toEqual({ error: ApiTransactionError.WrongNetwork });
    expect(fetchPrivateKeyString).not.toHaveBeenCalled();
  });

  it('allows EIP-712 data with no domain.chainId (chain-agnostic signing)', async () => {
    const result = await signPayload('bnb', '0-mainnet', {
      type: 'eip712',
      domain: { name: 'MyProtocol' },
      types: baseTypes,
      primaryType: 'Transfer',
      message: baseMessage,
    }, 'test-token');

    // fetchPrivateKeyString was called — validation passed, signing proceeded
    expect(fetchPrivateKeyString).toHaveBeenCalled();
    expect('error' in result).toBe(false);
  });

  it('allows EIP-712 data whose domain.chainId matches the connected network', async () => {
    const result = await signPayload('bnb', '0-mainnet', {
      type: 'eip712',
      domain: { name: 'MyProtocol', chainId: 56 },
      types: baseTypes,
      primaryType: 'Transfer',
      message: baseMessage,
    }, 'test-token');

    expect(fetchPrivateKeyString).toHaveBeenCalled();
    expect('error' in result).toBe(false);
  });

  it.each([1.5, 'abc', {}, -1, true])('rejects malformed domain.chainId %p without throwing', async (chainId) => {
    const result = await signPayload('bnb', '0-mainnet', {
      type: 'eip712',
      domain: { name: 'MyProtocol', chainId },
      types: baseTypes,
      primaryType: 'Transfer',
      message: baseMessage,
    }, 'test-token');

    expect(result).toEqual({ error: ApiTransactionError.WrongNetwork });
    expect(fetchPrivateKeyString).not.toHaveBeenCalled();
  });
});
