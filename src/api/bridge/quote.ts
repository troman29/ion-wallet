import { Address } from '@ton/core';

import type { ApiBridgeQuote, ApiBridgeSource } from '../types/bridge';

import { BRIDGE_CONFIG, BRIDGE_MIN_AMOUNT, BRIDGE_QUOTE_TTL } from './config';
import { parseAccountId } from '../../util/account';
import { estimateEvmFee } from '../chains/evm/transfer';
import { getEvmProvider } from '../chains/evm/util/client';
import { checkTransactionDraft } from '../chains/ton/transfer';
import { getTonClient } from '../chains/ton/util/tonCore';
import { getBridgeAccount, getBridgeContract } from './context';
import { addBridgeFeeBuffer, buildBridgeBurnData, calculateBridgeFee } from './helpers';

const MAX_UINT64 = (1n << 64n) - 1n;

export async function buildBridgeQuote(
  accountId: string,
  source: ApiBridgeSource,
  amount: string,
  approvedNetworkFee?: bigint,
): Promise<{ quote: ApiBridgeQuote; estimatedNetworkFee: bigint }> {
  if (source !== 'ton' && source !== 'bnb') throw new Error('Invalid bridge direction.');
  if (!/^\d+$/.test(amount)) throw new Error('Invalid amount.');

  const value = BigInt(amount);
  if (value > MAX_UINT64 || (value !== 0n && value < BRIDGE_MIN_AMOUNT)) {
    throw new Error('Minimum bridge amount is 10 ION.');
  }

  const { network } = parseAccountId(accountId);
  const addresses = await getBridgeAccount(accountId);
  const config = BRIDGE_CONFIG[network];
  const client = getTonClient(network);
  const provider = getEvmProvider(network, 'bnb');
  const contract = getBridgeContract(network);

  const [data, ionInfo, bnbBalance, tokenBalance, isBurnAllowed] = await Promise.all([
    client.runMethod(Address.parse(config.bridge), 'get_bridge_data'),
    client.getAddressInfo(addresses.ion),
    provider.getBalance(addresses.bnb),
    contract.balanceOf(addresses.bnb) as Promise<bigint>,
    contract.allowBurn() as Promise<boolean>,
  ]);
  if (data.stack.remaining !== 8 || (source === 'bnb' && !isBurnAllowed)) {
    throw new Error('Bridge is temporarily unavailable.');
  }

  const stateFlags = data.stack.readBigNumber();
  if (source === 'ton' && stateFlags & 1n) throw new Error('Bridge is temporarily unavailable.');

  data.stack.skip(3);
  const flat = data.stack.readBigNumber();
  const networkFee = data.stack.readBigNumber();
  const factor = data.stack.readBigNumber();
  const base = data.stack.readBigNumber();
  const balance = source === 'ton' ? BigInt(ionInfo.balance) : tokenBalance;

  // `create_swap_from_ton` and `execute_voting` use the same on-chain fee formula
  const bridgeFee = value ? calculateBridgeFee(value, flat + networkFee, factor, base) : 0n;

  let gas = 0n;
  if (source === 'ton') {
    const draft = await checkTransactionDraft({
      accountId,
      toAddress: config.bridge,
      payload: { type: 'comment', text: `swapTo#${addresses.bnb}` },
    });
    if (!draft.explainedFee?.fullFee) throw new Error('Unable to estimate the network fee.');

    gas = draft.explainedFee.fullFee.nativeSum;
  } else if (balance >= BRIDGE_MIN_AMOUNT) {
    gas = await estimateEvmFee(provider, {
      from: addresses.bnb,
      to: config.token,
      data: buildBridgeBurnData(value && value <= balance ? value : BRIDGE_MIN_AMOUNT, addresses.ion),
    });
  }

  // The approved fee includes headroom for gas price changes
  const estimatedNetworkFee = gas;
  const networkFeeLimit = approvedNetworkFee ?? addBridgeFeeBuffer(gas);
  const maxAmount = source === 'ton' ? (balance > networkFeeLimit ? balance - networkFeeLimit : 0n) : balance;

  if (value > maxAmount) throw new Error('Insufficient ION balance.');
  if (value && source === 'bnb' && bnbBalance < networkFeeLimit) {
    throw new Error('Not enough BNB for the network fee.');
  }

  return {
    estimatedNetworkFee,
    quote: {
      accountId,
      source,
      amount,
      fromAddress: source === 'ton' ? addresses.ion : addresses.bnb,
      toAddress: source === 'ton' ? addresses.bnb : addresses.ion,
      receiveAmount: (value - bridgeFee).toString(),
      bridgeFee: bridgeFee.toString(),
      networkFee: networkFeeLimit.toString(),
      balance: balance.toString(),
      nativeBalance: (source === 'ton' ? BigInt(ionInfo.balance) : bnbBalance).toString(),
      maxAmount: maxAmount.toString(),
      expiresAt: Date.now() + BRIDGE_QUOTE_TTL,
    },
  };
}
