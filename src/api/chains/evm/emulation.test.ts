import { Interface, Transaction } from 'ethers';

import { ApiTransactionError } from '../../types';

import { ION_BNB_MAINNET } from '../../../config';
import { parseTransactionForPreview } from './emulation';

jest.mock('./util/client', () => ({
  getEvmProvider: () => ({
    estimateGas: jest.fn().mockRejectedValue(new Error('RPC unavailable')),
  }),
}));

const WALLET = '0x5819e5Ff34198F315322e1863Be6C3dC927cC5C3';
const RECIPIENT = '0x1111111111111111111111111111111111111111';
const UNKNOWN_CONTRACT = '0x2222222222222222222222222222222222222222';
const GAS_LIMIT = 60_000n;
const GAS_PRICE = 3_000_000_000n;

const transferData = new Interface(['function transfer(address to, uint256 amount)'])
  .encodeFunctionData('transfer', [RECIPIENT, 25n]);

function serialize(to: string, value = 0n) {
  return Transaction.from({
    type: 0, chainId: 56, nonce: 0, to, value, data: transferData, gasLimit: GAS_LIMIT, gasPrice: GAS_PRICE,
  }).unsignedSerialized;
}

describe('parseTransactionForPreview', () => {
  it('recognizes a transfer of a configured token and shows its fee', async () => {
    const { transfers, emulation } = await parseTransactionForPreview(
      'bnb', serialize(ION_BNB_MAINNET.tokenAddress), WALLET, 'mainnet',
    );

    expect(transfers[0].isDangerous).toBe(false);
    expect(emulation?.activities[0]).toMatchObject({ amount: -25n, fee: GAS_LIMIT * GAS_PRICE });
    expect(emulation?.realFee).toBe(GAS_LIMIT * GAS_PRICE);
  });

  it('keeps a transfer-shaped call to an unknown contract dangerous', async () => {
    const { transfers, emulation } = await parseTransactionForPreview(
      'bnb', serialize(UNKNOWN_CONTRACT), WALLET, 'mainnet',
    );

    expect(transfers[0].isDangerous).toBe(true);
    expect(transfers[0]).toMatchObject({
      toAddress: UNKNOWN_CONTRACT,
      displayedToAddress: UNKNOWN_CONTRACT,
      amount: 0n,
      networkFee: GAS_LIMIT * GAS_PRICE,
      evmPreview: { data: transferData, maximumFee: GAS_LIMIT * GAS_PRICE },
    });
    expect(emulation).toBeUndefined();
  });

  it('keeps a token call that also sends BNB dangerous', async () => {
    const { transfers } = await parseTransactionForPreview(
      'bnb', serialize(ION_BNB_MAINNET.tokenAddress, 1n), WALLET, 'mainnet',
    );

    expect(transfers[0].isDangerous).toBe(true);
    expect(transfers[0].amount).toBe(1n);
  });

  it('previews a native transfer in wei, including a legacy maximum fee', async () => {
    const rawTx = Transaction.from({
      type: 0, chainId: 56, to: RECIPIENT, value: 1_234_567_890_123_456_789n,
      gasLimit: 21_000n, gasPrice: GAS_PRICE,
    }).unsignedSerialized;
    const { transfers } = await parseTransactionForPreview('bnb', rawTx, WALLET, 'mainnet');

    expect(transfers[0]).toMatchObject({
      toAddress: RECIPIENT,
      displayedToAddress: RECIPIENT,
      amount: 1_234_567_890_123_456_789n,
      networkFee: 21_000n * GAS_PRICE,
      rawPayload: rawTx,
      evmPreview: { data: '0x', maximumFee: 21_000n * GAS_PRICE },
    });
  });

  it('uses the EIP-1559 fee cap without adding the priority fee again', async () => {
    const rawTx = Transaction.from({
      type: 2, chainId: 56, to: UNKNOWN_CONTRACT, data: '0xdeadbeef1234', value: 100n,
      gasLimit: GAS_LIMIT, maxFeePerGas: GAS_PRICE, maxPriorityFeePerGas: 1_000_000_000n,
    }).unsignedSerialized;
    const { transfers, emulation } = await parseTransactionForPreview('bnb', rawTx, WALLET, 'mainnet');

    expect(transfers[0]).toMatchObject({
      amount: 100n,
      rawPayload: rawTx,
      evmPreview: { data: '0xdeadbeef1234', maximumFee: GAS_LIMIT * GAS_PRICE },
    });
    expect(emulation).toBeUndefined();
  });

  it('keeps deployment bytecode and value when there is no recipient', async () => {
    const rawTx = Transaction.from({
      type: 0, chainId: 56, value: 20n, data: '0x60006000', gasLimit: GAS_LIMIT, gasPrice: GAS_PRICE,
    }).unsignedSerialized;
    const { transfers } = await parseTransactionForPreview('bnb', rawTx, WALLET, 'mainnet');

    expect(transfers[0]).toMatchObject({
      displayedToAddress: '', amount: 20n, isDangerous: true,
      evmPreview: { data: '0x60006000', maximumFee: GAS_LIMIT * GAS_PRICE },
    });
  });

  it('does not present unavailable fees as a zero maximum fee', async () => {
    const rawTx = Transaction.from({
      type: 0, chainId: 56, to: UNKNOWN_CONTRACT, data: '0xdeadbeef',
    }).unsignedSerialized;
    const { transfers } = await parseTransactionForPreview('bnb', rawTx, WALLET, 'mainnet');

    expect(transfers[0].evmPreview).toEqual({ data: '0xdeadbeef', maximumFee: undefined });
  });

  it.each([0, 1, 97])('rejects chainId %s in a BNB mainnet preview', async (chainId) => {
    const rawTx = Transaction.from({
      type: 0, chainId, to: RECIPIENT, gasLimit: GAS_LIMIT, gasPrice: GAS_PRICE,
    }).unsignedSerialized;

    await expect(parseTransactionForPreview('bnb', rawTx, WALLET, 'mainnet'))
      .rejects.toMatchObject({ displayError: ApiTransactionError.WrongNetwork });
  });

  it('accepts BNB testnet transactions only in the matching network', async () => {
    const rawTx = Transaction.from({
      type: 0, chainId: 97, to: RECIPIENT, gasLimit: GAS_LIMIT, gasPrice: GAS_PRICE,
    }).unsignedSerialized;
    const { transfers } = await parseTransactionForPreview('bnb', rawTx, WALLET, 'testnet');

    expect(transfers[0].evmPreview).toBeDefined();
    expect(transfers[0].isDangerous).toBe(false);

    const mainnetTx = Transaction.from({
      type: 0, chainId: 56, to: RECIPIENT, gasLimit: GAS_LIMIT, gasPrice: GAS_PRICE,
    }).unsignedSerialized;
    await expect(parseTransactionForPreview('bnb', mainnetTx, WALLET, 'testnet'))
      .rejects.toMatchObject({ displayError: ApiTransactionError.WrongNetwork });
  });

  it('does not invent details for malformed serialized data', async () => {
    const { transfers } = await parseTransactionForPreview('bnb', '0x1234', WALLET, 'mainnet');

    expect(transfers[0].isDangerous).toBe(true);
    expect(transfers[0].evmPreview).toBeUndefined();
  });
});
