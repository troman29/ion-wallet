import type { AnyAction } from './types';

import { TONCOIN } from '../../../../config';
import { toBase64Address } from '../util/tonCore';
import { parseActions, parseActionsToActivities } from './actions';

const SENDER_RAW = '0:23D691D27F1A8B11658D78C7FA416F071ED01A981D70C2338A3B23017DDF84D7';
const SENDER = 'UQAj1pHSfxqLEWWNeMf6QW8HHtAamB1wwjOKOyMBfd-E18BE';
const WALLET_RAW = '0:3DA2E8C0A3E67EC8A7BA5EF3D61022FFB8943E0011C628E7E6284C6BE571D150';
const WALLET = 'UQA9oujAo-Z-yKe6XvPWECL_uJQ-ABHGKOfmKExr5XHRUAwS';

// A native transfer as the ION indexer returns it
const ION_TRANSFER = {
  type: 'ion_transfer',
  trace_id: 'nkGxYcugLc6fAxw30vrzaoXy12YGkYntaDXUe3c37yg=',
  action_id: 'l+X0F6eZ/Uabv0IFpe39G2hlATZZpvrYTXb8',
  start_lt: '24889313000001',
  end_lt: '24889313000003',
  start_utime: 1791700000,
  end_utime: 1791700000,
  transactions: [],
  success: true,
  trace_end_lt: '24889313000003',
  trace_end_utime: 1791700000,
  trace_mc_seqno_end: 1,
  trace_external_hash: 'Q+7QXrnbd6YICWOV/Qlmp03VJ/RWJ5gvHVD2yIK17mM=',
  details: {
    source: SENDER_RAW,
    destination: WALLET_RAW,
    value: '50000000000000000',
    comment: null, // eslint-disable-line no-null/no-null
    encrypted: false,
  },
} as AnyAction;

describe('parseActionsToActivities', () => {
  const options = {
    network: 'mainnet' as const,
    walletAddress: WALLET,
    metadata: {},
    addressBook: {},
  };

  it.each(['ion_transfer', 'ton_transfer'])('reads %s without address book entries', (type) => {
    const [activity] = parseActionsToActivities([{ ...ION_TRANSFER, type } as AnyAction], options);
    expect(activity).toMatchObject({
      fromAddress: SENDER,
      toAddress: WALLET,
      isIncoming: true,
      amount: 50_000_000_000_000_000n,
      status: 'completed',
    });
  });

  it('keeps valid history around unknown and incompatible actions', () => {
    const unknown = { ...ION_TRANSFER, type: 'unsupported_legacy_action' } as unknown as AnyAction;
    const missingDetails = { ...ION_TRANSFER, details: undefined } as unknown as AnyAction;
    const invalidAmount = {
      ...ION_TRANSFER,
      details: { ...ION_TRANSFER.details, value: 'invalid' },
    } as AnyAction;
    const activities = parseActionsToActivities([
      ION_TRANSFER, unknown, missingDetails, invalidAmount, ION_TRANSFER,
    ], options);
    expect(activities).toHaveLength(2);
    expect(activities.every((activity) => activity.kind === 'transaction'
      && activity.amount === 50_000_000_000_000_000n)).toBe(true);
  });

  it('recognizes an outgoing testnet transfer with a bounceable wallet address', () => {
    const walletAddress = toBase64Address(SENDER_RAW, true, 'testnet');
    const [activity] = parseActionsToActivities([{ ...ION_TRANSFER, success: false }], {
      ...options, network: 'testnet', walletAddress,
    });
    expect(activity).toMatchObject({
      fromAddress: walletAddress,
      toAddress: toBase64Address(WALLET_RAW, false, 'testnet'),
      isIncoming: false,
      amount: -50_000_000_000_000_000n,
      status: 'failed',
    });
  });

  it('keeps trace parsing strict when a known action is incompatible', () => {
    const action = { ...ION_TRANSFER, details: undefined } as unknown as AnyAction;
    expect(() => parseActions([action], options)).toThrow();
  });

  it('reads a jetton transfer without token or owner address book entries', () => {
    const action = {
      ...ION_TRANSFER,
      type: 'jetton_transfer',
      details: { sender: SENDER_RAW, receiver: WALLET_RAW, asset: SENDER_RAW, amount: '123' },
    } as AnyAction;
    const [activity] = parseActionsToActivities([action], options);
    expect(activity).toMatchObject({ isIncoming: true, amount: 123n });
  });

  it('reads an ION native transfer', () => {
    const [activity] = parseActionsToActivities([ION_TRANSFER], {
      network: 'mainnet',
      walletAddress: WALLET,
      metadata: {},
      addressBook: {
        [SENDER_RAW]: { user_friendly: SENDER, domain: null }, // eslint-disable-line no-null/no-null
        [WALLET_RAW]: { user_friendly: WALLET, domain: null }, // eslint-disable-line no-null/no-null
      },
    });

    expect(activity).toMatchObject({
      kind: 'transaction',
      slug: TONCOIN.slug,
      isIncoming: true,
      fromAddress: SENDER,
      amount: 50_000_000_000_000_000n,
    });
  });

  it('keeps raw actions until their trace outputs are known', () => {
    const traceId = 'failed-withdrawal';
    const failedWithdrawal = {
      ...ION_TRANSFER,
      trace_id: traceId,
      type: 'stake_withdrawal_request',
      success: false,
      details: { provider: 'ionstakers', stake_holder: WALLET_RAW, pool: SENDER_RAW, payout_nft: null }, // eslint-disable-line no-null/no-null
    } as AnyAction;
    const gasReturn = (opcode: string, actionId: string) => ({
      ...ION_TRANSFER,
      trace_id: traceId,
      action_id: actionId,
      type: 'call_contract',
      details: { opcode, source: SENDER_RAW, destination: WALLET_RAW, value: '100000000' },
    }) as AnyAction;

    const activities = parseActionsToActivities([
      gasReturn('0x7362d09c', 'notification'),
      gasReturn('0xd53276db', 'excess'),
      failedWithdrawal,
      { ...ION_TRANSFER, action_id: 'independent', trace_id: 'another-trace' },
    ], options);

    expect(activities).toHaveLength(4);
    expect(activities.map(({ status }) => status)).toEqual(['completed', 'completed', 'failed', 'completed']);
  });
});
