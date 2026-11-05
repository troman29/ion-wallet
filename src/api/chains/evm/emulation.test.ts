import { Interface, Transaction } from 'ethers';

import { ION_BNB_MAINNET } from '../../../config';
import { parseTransactionForPreview } from './emulation';

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
    expect(emulation).toBeUndefined();
  });

  it('keeps a token call that also sends BNB dangerous', async () => {
    const { transfers } = await parseTransactionForPreview(
      'bnb', serialize(ION_BNB_MAINNET.tokenAddress, 1n), WALLET, 'mainnet',
    );

    expect(transfers[0].isDangerous).toBe(true);
  });
});
