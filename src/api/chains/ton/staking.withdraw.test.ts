import * as tonCore from './util/tonCore';
import { TON_GAS } from './constants';
import { buildLiquidStakingWithdraw } from './staking';

jest.spyOn(tonCore, 'resolveTokenWalletAddress').mockResolvedValue('test-jetton-wallet');

describe('liquid staking withdrawal', () => {
  it('attaches the ION amount used by successful withdrawals', async () => {
    const result = await buildLiquidStakingWithdraw(
      'mainnet',
      `0:${'0'.repeat(64)}`,
      1_000_000_000n,
    );

    expect(result.amount).toBe(4_000_000_000n);
    expect(result.amount).toBe(TON_GAS.unstakeLiquid);
    expect(result.toAddress).toBe('test-jetton-wallet');
  });
});
