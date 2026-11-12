import { Address, Cell } from '@ton/core';
import { Interface, keccak256 } from 'ethers';

import type { ApiBridgeSwapData, ApiBridgeTransfer } from '../types/bridge';

import { BRIDGE_ABI } from './config';

interface BridgeMessage {
  source: string;
  destination: string;
  value: string;
  message?: string;
  msg_data?: { '@type': string; text?: string; body?: string };
}

export interface BridgeTransaction {
  utime: number;
  transaction_id: { lt: string; hash: string };
  in_msg: BridgeMessage;
  out_msgs: BridgeMessage[];
}

const QUERY_EXPIRY_OFFSET_SEC = 30 * 24 * 60 * 60 + 2;
const NETWORK_FEE_BUFFER_PERCENT = 120n;
const PERCENT_BASE = 100n;

export const BRIDGE_INTERFACE = new Interface(BRIDGE_ABI);

export function addBridgeFeeBuffer(fee: bigint) {
  return (fee * NETWORK_FEE_BUFFER_PERCENT + PERCENT_BASE - 1n) / PERCENT_BASE;
}

export function calculateBridgeFee(amount: bigint, flat: bigint, factor: bigint, base: bigint) {
  if (flat < 0n || factor < 0n || base <= 0n || factor >= base || amount <= flat) {
    throw new Error('Bridge amount is too low or the bridge is unavailable.');
  }

  return flat + ((amount - flat) * factor) / base;
}

export function buildBridgeBurnData(amount: bigint, recipient: string) {
  const address = Address.parse(recipient);
  if (address.workChain !== 0) throw new Error('Unsupported ION address.');

  return BRIDGE_INTERFACE.encodeFunctionData('burn', [
    amount,
    [address.workChain, `0x${address.hash.toString('hex')}`],
  ]);
}

/** Matches the deployed bridge's legacy string hashing for query IDs */
export function getBridgeQueryId(blockHash: string, txHash: string, logIndex: number, blockTime: number) {
  const chars = `${blockHash}_${txHash}_${logIndex}`.split('');
  chars[66] = '0';
  chars[67] = '0';
  chars[68] = '0';
  chars[69] = '0';
  chars[133] = chars[132];
  chars[132] = '0';

  // `keccak256@1.0.6` interprets a hex string as bytes and left-pads odd lengths
  const hex = chars.join('').slice(2);
  const hash = keccak256(`0x${hex.length % 2 ? '0' : ''}${hex}`);
  const suffix = BigInt(`0x${hash.slice(4, 12)}`);

  return ((BigInt(blockTime + QUERY_EXPIRY_OFFSET_SEC) << 32n) + suffix).toString();
}

export function parseBridgeSwap(
  transaction: BridgeTransaction,
  transfer: ApiBridgeTransfer,
): ApiBridgeSwapData | undefined {
  const { in_msg: message, transaction_id: id } = transaction;

  if (
    BigInt(id.lt) <= BigInt(transfer.startLt ?? '0')
    || !areIonAddressesEqual(message.source, transfer.fromAddress)
    || BigInt(message.value) !== BigInt(transfer.amount)
    || message.message?.trim().toLowerCase() !== `swapTo#${transfer.toAddress}`.toLowerCase()
  ) {
    return undefined;
  }

  for (const log of transaction.out_msgs) {
    if (log.destination) continue;

    const data
      = log.msg_data?.['@type'] === 'msg.dataText'
        ? Buffer.concat([Buffer.alloc(4), Buffer.from(log.msg_data.text ?? '', 'base64')])
        : getBridgeMessageBytes(log);
    if (data.length !== 28) continue;

    const receiver = `0x${data.subarray(0, 20).toString('hex')}`;
    const amount = data.readBigUInt64BE(20);
    if (
      receiver.toLowerCase() !== transfer.toAddress.toLowerCase()
      || amount <= 0n
      || amount > BigInt(transfer.amount)
    ) {
      continue;
    }

    const sender = Address.parse(message.source);

    return {
      receiver,
      amount: amount.toString(),
      tx: {
        address_: { workchain: sender.workChain, address_hash: `0x${sender.hash.toString('hex')}` },
        tx_hash: `0x${Buffer.from(id.hash, 'base64').toString('hex')}`,
        lt: id.lt,
      },
    };
  }

  return undefined;
}

/** The payout body embeds the originating EVM transaction hash and log index */
export function getBridgeReceivedAmount(
  transaction: BridgeTransaction,
  transfer: ApiBridgeTransfer,
  bridgeAddress: string,
) {
  const message = transaction.in_msg;
  if (
    !areIonAddressesEqual(message.source, bridgeAddress)
    || !areIonAddressesEqual(message.destination, transfer.toAddress)
  ) {
    return undefined;
  }

  const body = getBridgeMessageBytes(message);
  if (
    body.length !== 34
    || `0x${body.subarray(0, 32).toString('hex')}` !== transfer.txId?.toLowerCase()
    || body.readUInt16BE(32) !== transfer.logIndex
  ) {
    return undefined;
  }

  const amount = BigInt(message.value);

  return amount > 0n && amount <= BigInt(transfer.amount) ? amount.toString() : undefined;
}

export function areIonAddressesEqual(first: string, second: string) {
  try {
    return Address.parse(first).equals(Address.parse(second));
  } catch {
    return false;
  }
}

function getBridgeMessageBytes(message: BridgeMessage) {
  if (message.msg_data?.body) {
    const slice = Cell.fromBase64(message.msg_data.body).beginParse();

    return slice.loadBuffer(Math.floor(slice.remainingBits / 8));
  }

  return Buffer.from(message.message?.trim() ?? '', 'base64');
}
