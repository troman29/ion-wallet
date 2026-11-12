import { Address, beginCell } from '@ton/core';

import type { ApiBridgeTransfer } from '../types/bridge';
import type { BridgeTransaction } from './helpers';

import { BRIDGE_CONFIG } from './config';
import {
  BRIDGE_INTERFACE, buildBridgeBurnData, calculateBridgeFee, getBridgeQueryId,
  getBridgeReceivedAmount, parseBridgeSwap,
} from './helpers';

const ION = new Address(0, Buffer.alloc(32, 1)).toString();
const BNB = `0x${'22'.repeat(20)}`;
const TRANSACTION_HASH = `0x${'33'.repeat(32)}`;
const TEST_TRANSFER = {
  fromAddress: ION,
  toAddress: BNB,
  amount: '100000000000',
  startLt: '123',
} as ApiBridgeTransfer;

it('encodes the direct ION burn with nine decimals and the receiving ION address', () => {
  const data = buildBridgeBurnData(10_123_456_789n, ION);
  const decoded = BRIDGE_INTERFACE.decodeFunctionData('burn', data);

  expect(decoded.amount).toBe(10_123_456_789n);
  expect(decoded.addr.workchain).toBe(0n);
  expect(decoded.addr.address_hash).toBe(`0x${'01'.repeat(32)}`);
  expect(() => buildBridgeBurnData(1n, new Address(-1, Buffer.alloc(32)).toString())).toThrow();
});

it('calculates flat and proportional fees without losing nanoION or rounding up', () => {
  expect(calculateBridgeFee(10_000_000_001n, 500_000_000n, 100n, 10000n)).toBe(595_000_000n);
  expect(calculateBridgeFee(18_000_000_000_000_000_001n, 500_000_000n, 100n, 10000n))
    .toBe(180_000_000_495_000_000n);
  expect(() => calculateBridgeFee(10n, 10n, 0n, 10000n)).toThrow();
  expect(() => calculateBridgeFee(100n, 0n, 10000n, 10000n)).toThrow();
});

it('preserves logical times beyond Number.MAX_SAFE_INTEGER when recovering a swap', () => {
  const parsed = parseBridgeSwap(buildSwapTransaction(), TEST_TRANSFER)!;

  expect(parsed.tx.lt).toBe('90071992547409939');
  expect(parsed.amount).toBe('99500000000');
  expect(parsed.receiver).toBe(BNB);
});

it('does not attribute another sender, recipient, amount, or old transaction to this transfer', () => {
  const transaction = buildSwapTransaction();
  const otherSender = new Address(0, Buffer.alloc(32, 2)).toString();

  expect(parseBridgeSwap(transaction, { ...TEST_TRANSFER, fromAddress: otherSender })).toBeUndefined();
  expect(parseBridgeSwap(transaction, { ...TEST_TRANSFER, toAddress: `0x${'44'.repeat(20)}` })).toBeUndefined();
  expect(parseBridgeSwap(transaction, { ...TEST_TRANSFER, amount: '999' })).toBeUndefined();
  expect(parseBridgeSwap(transaction, { ...TEST_TRANSFER, startLt: transaction.transaction_id.lt })).toBeUndefined();
});

it('accepts a payout only from the bridge, for the exact EVM transaction and event index', () => {
  const payout = {
    ...TEST_TRANSFER,
    toAddress: ION,
    txId: TRANSACTION_HASH,
    logIndex: 64,
  };
  const transaction = buildSwapTransaction();
  transaction.in_msg = {
    source: BRIDGE_CONFIG.mainnet.bridge,
    destination: ION,
    value: '99499999000',
    msg_data: {
      '@type': 'msg.dataRaw',
      body: beginCell().storeBuffer(Buffer.from(TRANSACTION_HASH.slice(2), 'hex')).storeUint(64, 16)
        .endCell().toBoc().toString('base64'),
    },
  };

  expect(getBridgeReceivedAmount(transaction, payout, BRIDGE_CONFIG.mainnet.bridge)).toBe('99499999000');
  expect(getBridgeReceivedAmount(transaction, { ...payout, logIndex: 65 }, BRIDGE_CONFIG.mainnet.bridge))
    .toBeUndefined();

  const otherTransfer = { ...payout, txId: `0x${'00'.repeat(32)}` };

  expect(getBridgeReceivedAmount(transaction, otherTransfer, BRIDGE_CONFIG.mainnet.bridge)).toBeUndefined();
  expect(getBridgeReceivedAmount(transaction, payout, ION)).toBeUndefined();
});

it('matches the deployed legacy query encoding for both even and odd log-index lengths', () => {
  const block = '0xcad62a0e0090e30e0133586f86ed8b7d0d2eac5fa8ded73b8180931ff379b113';
  const hash = '0x77e5617841b2d355fe588716b6f8f506b683e985fc98fdb819ddf566594d4cfd';

  // Reference values use `ion-bridge-web` with its pinned `keccak256@1.0.6` byte conversion
  expect(getBridgeQueryId(block, hash, 64, 1700000000)).toBe('7312576968695166399');
  expect(getBridgeQueryId(block, hash, 1, 1700000000)).toBe('7312576970045877448');
});

function buildSwapTransaction(): BridgeTransaction {
  const data = Buffer.alloc(28);
  Buffer.from(BNB.slice(2), 'hex').copy(data);
  data.writeBigUInt64BE(99_500_000_000n, 20);

  return {
    utime: 1000,
    transaction_id: { lt: '90071992547409939', hash: Buffer.alloc(32, 5).toString('base64') },
    in_msg: {
      source: ION,
      destination: BRIDGE_CONFIG.mainnet.bridge,
      value: TEST_TRANSFER.amount,
      message: `swapTo#${BNB}`,
    },
    out_msgs: [{
      source: '',
      destination: '',
      value: '0',
      message: `${data.toString('base64')}\n`,
    }],
  };
}
