import { keccak256, Transaction } from 'ethers';

import type { ApiBridgeTransfer } from '../types/bridge';

import { BRIDGE_CONFIG } from './config';
import { parseAccountId } from '../../util/account';
import { logDebugError } from '../../util/logs';
import { fetchPrivateKeyString, getSignerFromPrivateKey } from '../chains/evm/auth';
import { getEvmProvider } from '../chains/evm/util/client';
import { createLocalTransactions } from '../methods/transfer';
import { getBridgeAccount } from './context';
import { saveTransfer } from './store';

export async function broadcastEvmTransfer(
  transfer: ApiBridgeTransfer,
  data: string,
  enclaveToken: string,
  isClaim = false,
  feeLimit = transfer.networkFee,
) {
  const { accountId } = transfer;
  const { network } = parseAccountId(accountId);
  const addresses = await getBridgeAccount(accountId);
  const provider = getEvmProvider(network, 'bnb');

  const key = await fetchPrivateKeyString('bnb', accountId, enclaveToken);
  if (!key) throw new Error('Unable to authorize the transfer.');

  const signer = getSignerFromPrivateKey(network, key).connect(provider);
  if (signer.address.toLowerCase() !== addresses.bnb.toLowerCase()) {
    throw new Error('Wallet address changed.');
  }

  const transaction = await signer.populateTransaction({ to: BRIDGE_CONFIG[network].token, data, value: 0n });
  const maximumFee
    = BigInt(transaction.gasLimit!) * BigInt(transaction.maxFeePerGas ?? transaction.gasPrice!);
  if (maximumFee > BigInt(feeLimit)) {
    throw new Error('The quote changed. Please review the transfer again.');
  }
  if ((await provider.getBalance(addresses.bnb)) < maximumFee) {
    throw new Error('Not enough BNB for the network fee.');
  }

  const signed = await signer.signTransaction(transaction);
  const hash = Transaction.from(signed).hash ?? keccak256(signed);

  const submitted = await saveTransfer({
    ...transfer,
    error: undefined,
    signedEvmTransaction: signed,
    ...(isClaim ? { claimTxId: hash, claimNetworkFee: feeLimit, status: 'claiming' as const } : { txId: hash }),
  });

  try {
    await provider.broadcastTransaction(signed);
  } catch (err) {
    logDebugError('bridge.broadcastEvmTransfer', err, { transferId: transfer.id, isClaim });

    // The persisted hash allows polling to reconcile an ambiguous broadcast
    return saveTransfer({
      ...submitted,
      error: 'Submission could not be confirmed. Check the transfer status.',
    });
  }

  if (!isClaim) {
    createLocalTransactions(accountId, 'bnb', [
      {
        id: hash,
        externalMsgHashNorm: hash,
        amount: BigInt(transfer.amount),
        fromAddress: addresses.bnb,
        toAddress: BRIDGE_CONFIG[network].token,
        slug: `bnb-${BRIDGE_CONFIG[network].token}`,
        fee: maximumFee,
      },
    ]);
  }

  return submitted;
}
