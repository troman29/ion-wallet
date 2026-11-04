import type { BnbHistoryItem } from './types';

import { ION_BNB_MAINNET } from '../../../config';
import { reconcileNewActivitiesUpdate } from '../../common/activities/reconciler/pendingReconciler';
import { transformBnbItem } from './activities';

jest.mock('../../common/tokens', () => ({
  buildTokenSlug: jest.fn((chain: string, address: string) => `${chain}-${address}`),
  getTokenBySlug: jest.fn(),
}));

const WALLET = '0x5819e5Ff34198F315322e1863Be6C3dC927cC5C3';
const OTHER = '0x1111111111111111111111111111111111111111';
const HASH = '0x97fde0ab8a3eda6528a5680c55b1e97e68c620cfb24bbaba7c8d66b0b6532243';

function item(overrides: Partial<BnbHistoryItem>): BnbHistoryItem {
  return {
    id: `${HASH}:t0`,
    hash: HASH,
    kind: 'native',
    from: WALLET.toLowerCase(),
    to: OTHER,
    amount: '1000',
    fee: '21000',
    isFailed: false,
    timestamp: 1_793_800_000_123,
    blockNumber: 1,
    ...overrides,
  };
}

describe('transformBnbItem', () => {
  it('maps an outgoing BNB transfer', () => {
    expect(transformBnbItem('bnb', item({}), WALLET)).toMatchObject({
      id: `${HASH}:t0`,
      amount: -1000n,
      isIncoming: false,
      fee: 21000n,
      status: 'completed',
      externalMsgHashNorm: HASH,
      fromAddress: WALLET,
    });
  });

  it('maps an incoming ION transfer onto the token slug', () => {
    const activity = transformBnbItem('bnb', item({
      id: `${HASH}:l3`,
      kind: 'token',
      token: ION_BNB_MAINNET.tokenAddress.toLowerCase(),
      from: OTHER,
      to: WALLET.toLowerCase(),
      fee: undefined,
    }), WALLET);

    expect(activity).toMatchObject({ amount: 1000n, isIncoming: true, fee: 0n });
    expect(activity.slug.startsWith('bnb-')).toBe(true);
  });

  it('marks a failed contract call', () => {
    expect(transformBnbItem('bnb', item({ amount: '0', isFailed: true }), WALLET)).toMatchObject({
      type: 'callContract',
      status: 'failed',
    });
  });

  it('lets the confirmed transfer replace the local one created on send', () => {
    const confirmed = transformBnbItem('bnb', item({}), WALLET);
    const local = { ...confirmed, id: `${HASH}:0:local`, status: 'pendingTrusted' as const };

    const { patch } = reconcileNewActivitiesUpdate([local], [confirmed]);

    expect(patch.replacedIds).toEqual({ [local.id]: confirmed.id });
  });
});
