import type { ApiToken } from '../../api/types';

import { getToncoinAmountForTransfer } from './getTonOperationFees';

const token: ApiToken = {
  name: 'Test',
  symbol: 'TEST',
  slug: 'ton-test',
  decimals: 9,
  chain: 'ton',
};

describe('attached ION for token transfers', () => {
  it('quadruples the sent amount without changing the estimated spent amount', () => {
    expect(getToncoinAmountForTransfer(token, false)).toMatchObject({
      amount: 200_000_000n,
      realAmount: 32_100_000n,
    });
    expect(getToncoinAmountForTransfer({ ...token, isTiny: true }, false)).toMatchObject({
      amount: 72_000_000n,
      realAmount: 8_000_000n,
    });
    expect(getToncoinAmountForTransfer(token, true)).toMatchObject({
      amount: 280_000_000n,
      realAmount: 52_100_000n,
    });
  });
});
