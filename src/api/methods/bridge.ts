import type { ApiBridgeQuote, ApiBridgeSource, ApiBridgeTransfer } from '../types/bridge';

import { IONCOIN } from '../../config';
import { parseAccountId } from '../../util/account';
import { logDebug, logDebugError } from '../../util/logs';
import { BRIDGE_CONFIG, BRIDGE_MIN_AMOUNT } from '../bridge/config';
import { getBridgeContract } from '../bridge/context';
import { broadcastEvmTransfer } from '../bridge/evm';
import { addBridgeFeeBuffer, BRIDGE_INTERFACE, buildBridgeBurnData } from '../bridge/helpers';
import { buildBridgeQuote } from '../bridge/quote';
import { getBridgeSignatures, refreshBridgeTransfer } from '../bridge/status';
import { readTransfers, runBridgeTask, saveTransfer } from '../bridge/store';
import { estimateEvmFee } from '../chains/evm/transfer';
import { getEvmProvider } from '../chains/evm/util/client';
import { submitGasfullTransfer } from '../chains/ton/transfer';
import { getTonClient } from '../chains/ton/util/tonCore';
import { fetchStoredAccount } from '../common/accounts';
import {
  fetchActiveBridgeOperations, fetchBridgeHistory, fetchBridgeOperation,
} from '../common/activities/bridge/backend';
import { buildBridgeActivity, getBridgeActivityId } from '../common/activities/bridge/projection';
import { mergeServerBridgeTransfers } from '../common/activities/bridge/restore';
import { getBackendConfigCacheSync } from '../common/cache';
import { createLocalTransactions } from './transfer';

export async function getBridgeQuote(
  accountId: string,
  source: ApiBridgeSource,
  amount: string,
): Promise<ApiBridgeQuote> {
  const { quote } = await buildBridgeQuote(accountId, source, amount);

  return quote;
}

export function submitBridge(quote: ApiBridgeQuote, enclaveToken: string) {
  return runBridgeTask(async () => {
    if (quote.expiresAt < Date.now() || BigInt(quote.amount) < BRIDGE_MIN_AMOUNT) {
      throw new Error('The quote expired. Please review the transfer again.');
    }

    const existing = (await readTransfers(quote.accountId)).find(
      ({ status }) => status !== 'completed' && status !== 'failed',
    );
    if (existing) return existing;

    const { quote: fresh, estimatedNetworkFee } = await buildBridgeQuote(
      quote.accountId, quote.source, quote.amount, BigInt(quote.networkFee),
    );
    if (
      fresh.fromAddress !== quote.fromAddress
      || fresh.toAddress !== quote.toAddress
      || BigInt(fresh.receiveAmount) < BigInt(quote.receiveAmount)
      || estimatedNetworkFee > BigInt(quote.networkFee)
    ) {
      logDebug('bridge.quoteChanged', {
        source: quote.source,
        addressesChanged: fresh.fromAddress !== quote.fromAddress || fresh.toAddress !== quote.toAddress,
        approvedReceiveAmount: quote.receiveAmount,
        currentReceiveAmount: fresh.receiveAmount,
        approvedNetworkFee: quote.networkFee,
        estimatedNetworkFee: estimatedNetworkFee.toString(),
      });
      throw new Error('The quote changed. Please review the transfer again.');
    }

    const { network } = parseAccountId(quote.accountId);
    const config = BRIDGE_CONFIG[network];
    let transfer: ApiBridgeTransfer = {
      ...fresh,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      status: 'pending',
    };

    if (quote.source === 'ton') {
      const client = getTonClient(network);
      const [bridgeInfo, sourceInfo] = await Promise.all([
        client.getAddressInfo(config.bridge), client.getAddressInfo(fresh.fromAddress),
      ]);
      transfer.startLt = bridgeInfo.last_transaction_id.lt;
      transfer.nativeStartLt = sourceInfo.last_transaction_id.lt;

      const result = await submitGasfullTransfer({
        accountId: quote.accountId,
        enclaveToken,
        toAddress: config.bridge,
        amount: BigInt(quote.amount),
        fee: BigInt(fresh.networkFee),
        payload: { type: 'comment', text: `swapTo#${fresh.toAddress}` },
        beforeBroadcast: async ({
          boc,
          msgHashNormalized,
          validUntil,
          seqno,
        }) => {
          transfer = await saveTransfer({
            ...transfer,
            txId: msgHashNormalized,
            nativeSubmission: { boc, validUntil, seqno },
          });
        },
      });
      if ('error' in result) {
        if (!transfer.nativeSubmission) {
          return saveTransfer({ ...transfer, status: 'failed', error: 'The bridge transaction failed.' });
        }

        // Broadcast failures can be ambiguous. Keep the recoverable intent and scan the bridge.
        return saveTransfer({
          ...transfer,
          error: 'Submission could not be confirmed. Check the transfer status.',
        });
      }

      transfer = await saveTransfer({ ...transfer, txId: result.txId });
      createLocalTransactions(quote.accountId, 'ton', [
        {
          ...result.localActivityParams,
          id: result.txId!,
          amount: BigInt(quote.amount),
          fromAddress: fresh.fromAddress,
          toAddress: config.bridge,
          slug: IONCOIN.slug,
          comment: `swapTo#${fresh.toAddress}`,
          fee: BigInt(fresh.networkFee),
        },
      ]);
    } else {
      transfer.startLt = (await getTonClient(network).getAddressInfo(fresh.toAddress)).last_transaction_id.lt;
      transfer = await broadcastEvmTransfer(
        transfer,
        buildBridgeBurnData(BigInt(quote.amount), fresh.toAddress),
        enclaveToken,
      );
    }

    return transfer;
  });
}

export function getBridgeTransfers(accountId: string, shouldRefresh = false, selectedOperationId?: string) {
  return runBridgeTask(async () => {
    const local = await readTransfers(accountId);
    const cached = local.flatMap((transfer) =>
      transfer.serverOperation ? [buildBridgeActivity(transfer.serverOperation)] : []);
    const [server, active, selected] = await Promise.all([
      fetchBridgeHistory(accountId, cached),
      fetchActiveBridgeOperations(accountId),
      selectedOperationId ? fetchBridgeOperation(accountId, selectedOperationId) : undefined,
    ]);
    const operationById = new Map(active.map((operation) => [operation.id, operation]));
    for (const { operation } of server.activities) {
      const previous = operationById.get(operation.id);
      if (!previous || BigInt(previous.revision) <= BigInt(operation.revision)) {
        operationById.set(operation.id, operation);
      }
    }
    if (selected) {
      const previous = operationById.get(selected.id);
      if (!previous || BigInt(previous.revision) <= BigInt(selected.revision)) {
        operationById.set(selected.id, selected);
      }
    }
    const removedIds = new Set(server.removedIds);
    const surviving = local.filter((transfer) => !transfer.serverOperationId
      || !removedIds.has(getBridgeActivityId(transfer.serverOperationId, parseAccountId(accountId).network)));
    const operations = [...operationById.values()].filter((operation) =>
      !removedIds.has(getBridgeActivityId(operation.id, operation.network)));
    const transfers = mergeServerBridgeTransfers(accountId, surviving, operations);
    if (!shouldRefresh) return transfers;

    const results: ApiBridgeTransfer[] = [];

    for (const transfer of transfers) {
      if (transfer.status === 'completed' || transfer.status === 'failed') {
        if (local.some(({ id }) => id === transfer.id)) await saveTransfer(transfer);
        results.push(transfer);
        continue;
      }

      try {
        let refreshed = transfer.serverOperationId
          ? await refreshServerBridgeTransfer(transfer) : await refreshBridgeTransfer(transfer);
        if (getBackendConfigCacheSync()?.isBridgeHistoryEnabled === true
          && !transfer.serverOperationId && transfer.source === 'ton' && refreshed.status === 'completed') {
          refreshed = { ...refreshed, status: transfer.claimTxId ? 'claiming' : 'waiting' };
        }
        results.push(await saveTransfer(refreshed));
      } catch (err) {
        logDebugError('bridge.refreshTransfer', err, { transferId: transfer.id, source: transfer.source });
        // RPC failures do not change the transfer's on-chain state
        results.push({ ...transfer, error: 'Unable to refresh the bridge. Your transfer is saved.' });
      }
    }

    return results;
  });
}

export function getBridgeClaimFee(accountId: string, id: string) {
  return runBridgeTask(async () => {
    const { transfer, data } = await prepareBridgeClaim(accountId, id);
    const { network } = parseAccountId(accountId);

    const fee = await estimateEvmFee(getEvmProvider(network, 'bnb'), {
      from: transfer.toAddress,
      to: BRIDGE_CONFIG[network].token,
      data,
    });

    return addBridgeFeeBuffer(fee).toString();
  });
}

export function claimBridge(accountId: string, id: string, maximumFee: string, enclaveToken: string) {
  return runBridgeTask(async () => {
    const { transfer, data } = await prepareBridgeClaim(accountId, id);

    return broadcastEvmTransfer(transfer, data, enclaveToken, true, maximumFee);
  });
}

async function prepareBridgeClaim(accountId: string, id: string) {
  let stored = (await readTransfers(accountId)).find((transfer) => transfer.id === id && transfer.source === 'ton');
  if (!stored) {
    const selected = await fetchBridgeOperation(accountId, id);
    stored = mergeServerBridgeTransfers(accountId, [], selected ? [selected] : [])
      .find((transfer) => (transfer.id === id || transfer.serverOperationId === id) && transfer.source === 'ton');
  }
  if (!stored) throw new Error('Bridge transfer not found.');

  const account = await fetchStoredAccount(accountId);
  if (account.byChain.bnb?.address.toLowerCase() !== stored.toAddress.toLowerCase()
    || stored.swapData?.receiver.toLowerCase() !== stored.toAddress.toLowerCase()) {
    throw new Error('Wallet address changed.');
  }

  const transfer = await saveTransfer(stored.serverOperationId
    ? await refreshServerBridgeTransfer(stored) : await refreshBridgeTransfer(stored));
  if (transfer.status !== 'claimable' || !transfer.swapData) {
    throw new Error('Bridge transfer is not ready to claim.');
  }

  const { network } = parseAccountId(accountId);
  const { signatures, requiredVotes } = await getBridgeSignatures(network, transfer.swapId!);
  if (signatures.length < requiredVotes) throw new Error('Waiting for bridge confirmations');

  return {
    transfer,
    data: BRIDGE_INTERFACE.encodeFunctionData('voteForMinting', [transfer.swapData, signatures]),
  };
}

async function refreshServerBridgeTransfer(transfer: ApiBridgeTransfer): Promise<ApiBridgeTransfer> {
  if (transfer.source !== 'ton' || !transfer.swapId || !transfer.swapData) return transfer;
  if (transfer.status === 'completed' || transfer.status === 'failed') return transfer;

  const { network } = parseAccountId(transfer.accountId);
  if (await getBridgeContract(network).finishedVotings(transfer.swapId)) {
    // Completion requires the server's finalized destination evidence, even when somebody else claimed it.
    return { ...transfer, status: transfer.claimTxId ? 'claiming' : 'waiting' };
  }

  if (transfer.claimTxId) {
    const receipt = await getEvmProvider(network, 'bnb').getTransactionReceipt(transfer.claimTxId);
    if (!receipt || receipt.status === 1) return { ...transfer, status: 'claiming' };

    transfer = { ...transfer, claimTxId: undefined, signedEvmTransaction: undefined };
  }

  const { signatures, requiredVotes } = await getBridgeSignatures(network, transfer.swapId!);

  return {
    ...transfer,
    votes: signatures.length,
    requiredVotes,
    status: signatures.length >= requiredVotes ? 'claimable' : 'waiting',
    error: undefined,
  };
}
