import { Address } from '@ton/core';
import { Signature, toBeHex } from 'ethers';

import type { ApiNetwork } from '../types';
import type { ApiBridgeTransfer } from '../types/bridge';
import type { BridgeTransaction } from './helpers';

import { BRIDGE_CONFIG, BRIDGE_CONFIRMATIONS, BRIDGE_TRANSACTION_PAGE_SIZE } from './config';
import { parseAccountId } from '../../util/account';
import { logDebugError } from '../../util/logs';
import { pause } from '../../util/schedulers';
import { getEvmProvider } from '../chains/evm/util/client';
import { getTonClient } from '../chains/ton/util/tonCore';
import { getBridgeContract } from './context';
import { BRIDGE_INTERFACE, getBridgeQueryId, getBridgeReceivedAmount, parseBridgeSwap } from './helpers';
import { recoverExpiredNativeTransfer } from './nativeRecovery';

const VOTING_NOT_FOUND_EXIT_CODE = 309;
const ORACLE_SET_RETRY_DELAY_MS = 500;

export async function refreshBridgeTransfer(transfer: ApiBridgeTransfer): Promise<ApiBridgeTransfer> {
  const { network } = parseAccountId(transfer.accountId);
  const contract = getBridgeContract(network);
  const provider = getEvmProvider(network, 'bnb');
  const config = BRIDGE_CONFIG[network];
  const client = getTonClient(network);
  const evmHash = transfer.source === 'bnb' ? transfer.txId : transfer.claimTxId;

  if (evmHash && transfer.signedEvmTransaction && !await provider.getTransaction(evmHash)) {
    // Reusing the signed bytes preserves the original nonce during recovery
    await provider.broadcastTransaction(transfer.signedEvmTransaction).catch((err) => {
      logDebugError('bridge.rebroadcastEvmTransfer', err, { transferId: transfer.id });
    });
  }

  if (transfer.source === 'bnb') {
    if (!transfer.txId) return transfer;

    const receipt = await provider.getTransactionReceipt(transfer.txId);
    if (!receipt) return transfer;
    if (receipt.status !== 1) {
      return {
        ...transfer,
        signedEvmTransaction: undefined,
        status: 'failed',
        error: 'The bridge transaction failed.',
      };
    }

    const confirmations = Math.min(
      BRIDGE_CONFIRMATIONS,
      (await provider.getBlockNumber()) - receipt.blockNumber,
    );
    if (confirmations < BRIDGE_CONFIRMATIONS) {
      return {
        ...transfer,
        status: 'confirming',
        confirmations,
        error: undefined,
      };
    }

    let queryId = transfer.queryId;
    let logIndex = transfer.logIndex;
    if (!queryId) {
      const recipient = Address.parse(transfer.toAddress);
      const event = receipt.logs.find((log) => {
        if (log.address.toLowerCase() !== config.token.toLowerCase()) return false;

        try {
          const parsed = BRIDGE_INTERFACE.parseLog(log);

          return (
            parsed?.name === 'SwapEthToIon'
            && parsed.args.from.toLowerCase() === transfer.fromAddress.toLowerCase()
            && parsed.args.to_wc === BigInt(recipient.workChain)
            && parsed.args.to_addr_hash.toLowerCase() === `0x${recipient.hash.toString('hex')}`
            && parsed.args.value === BigInt(transfer.amount)
          );
        } catch {
          return false;
        }
      });
      if (!event) throw new Error('Bridge event missing.');

      const block = await provider.getBlock(receipt.blockNumber);
      if (!block) throw new Error('Block unavailable.');

      queryId = getBridgeQueryId(receipt.blockHash, receipt.hash, event.index, block.timestamp);
      logIndex = event.index;
    }

    transfer = {
      ...transfer,
      queryId,
      logIndex,
      confirmations,
      error: undefined,
    };

    const { transactions, cursor } = await scanBridgeTransactions(transfer, transfer.toAddress);
    const received = transactions
      .map((transaction) => getBridgeReceivedAmount(transaction, transfer, config.bridge))
      .find(Boolean);
    if (received) {
      return {
        ...transfer,
        signedEvmTransaction: undefined,
        receiveAmount: received,
        status: 'completed',
      };
    }

    const result = await client.runMethod(Address.parse(config.multisig), 'get_query_state', [
      { type: 'int', value: BigInt(queryId) },
    ]);
    result.stack.skip();
    const mask = result.stack.readBigNumber();

    return {
      ...transfer,
      ...cursor,
      votes: mask >= 0n ? mask.toString(2).replace(/0/g, '').length : undefined,
      status: 'waiting',
    };
  }

  if (!transfer.swapData) {
    // The persisted cursor bounds each poll and survives restarting the app
    const { transactions, cursor } = await scanBridgeTransactions(transfer, config.bridge);
    const swapData = transactions.map((transaction) => parseBridgeSwap(transaction, transfer)).find(Boolean);
    if (!swapData) {
      const scanned = { ...transfer, ...cursor };
      if (transfer.nativeSubmission && !cursor.scanLt) {
        try {
          if (Date.now() / 1000 < transfer.nativeSubmission.validUntil) {
            await client.sendFile(transfer.nativeSubmission.boc);
          }
        } catch (err) {
          logDebugError('bridge.rebroadcastNativeTransfer', err, { transferId: transfer.id });
        }
      }

      return cursor.scanLt ? scanned : recoverExpiredNativeTransfer(scanned);
    }

    const swapId = (await contract.getSwapDataId(swapData)) as string;

    transfer = {
      ...transfer,
      swapData,
      swapId,
      receiveAmount: swapData.amount,
      status: 'waiting',
      error: undefined,
      nativeSubmission: undefined,
      nativeRecovery: undefined,
    };
  }

  if (await contract.finishedVotings(transfer.swapId)) {
    return {
      ...transfer,
      signedEvmTransaction: undefined,
      status: 'completed',
      error: undefined,
    };
  }

  if (transfer.claimTxId) {
    const receipt = await provider.getTransactionReceipt(transfer.claimTxId);
    if (!receipt) return transfer;

    if (receipt.status !== 1) {
      transfer = {
        ...transfer,
        claimTxId: undefined,
        signedEvmTransaction: undefined,
        status: 'claimable',
      };
    }
  }

  const { signatures, requiredVotes } = await getBridgeSignatures(network, transfer.swapId!);

  return {
    ...transfer,
    votes: signatures.length,
    requiredVotes,
    error: undefined,
    status: transfer.claimTxId ? 'claiming' : signatures.length >= requiredVotes ? 'claimable' : 'waiting',
  };
}

export async function getBridgeSignatures(network: ApiNetwork, swapId: string) {
  const contract = getBridgeContract(network);
  let oracleSet: string[] = await contract.getFullOracleSet();
  if (!oracleSet.length) {
    await pause(ORACLE_SET_RETRY_DELAY_MS);
    oracleSet = await contract.getFullOracleSet();
  }
  const oracles = oracleSet.map((address) => address.toLowerCase());
  if (!oracles.length) {
    throw new Error('Unable to read bridge confirmations.');
  }

  const requiredVotes = Math.ceil((oracles.length * 2) / 3);

  const result = await getTonClient(network).callRpc('runGetMethod', {
    address: BRIDGE_CONFIG[network].collector,
    method: 'get_external_voting_data',
    stack: [['num', swapId]],
  });

  const signatures: { signer: string; signature: string }[] = [];
  if (result.exit_code === VOTING_NOT_FOUND_EXIT_CODE) return { signatures, requiredVotes };
  if (result.exit_code !== 0) throw new Error('Unable to read bridge confirmations.');

  const list = result.stack[0]?.[1]?.elements ?? [];
  const seen = new Set<string>();
  for (const item of list) {
    const entry = item.tuple.elements;
    const signer = toBeHex(BigInt(entry[0].number.number), 20).toLowerCase();
    const signatureValues = entry[1].tuple.elements;
    const signatureR = toBeHex(BigInt(signatureValues[0].number.number), 32);
    const signatureS = toBeHex(BigInt(signatureValues[1].number.number), 32);
    const recoveryId = Number(signatureValues[2].number.number);
    if (!oracles.includes(signer) || seen.has(signer)) continue;

    seen.add(signer);
    signatures.push({
      signer,
      signature: Signature.from({ r: signatureR, s: signatureS, v: recoveryId }).serialized,
    });
  }

  signatures.sort((a, b) => (BigInt(a.signer) < BigInt(b.signer) ? -1 : 1));

  return { signatures, requiredVotes };
}

async function scanBridgeTransactions(transfer: ApiBridgeTransfer, address: string) {
  const { network } = parseAccountId(transfer.accountId);
  const transactions: BridgeTransaction[] = await getTonClient(network).callRpc('getTransactions', {
    address,
    limit: BRIDGE_TRANSACTION_PAGE_SIZE,
    archival: true,
    ...(transfer.scanLt ? { lt: transfer.scanLt, hash: transfer.scanHash } : {}),
  });
  const last = transactions[transactions.length - 1];
  const hasMore
    = last
      && transactions.length >= BRIDGE_TRANSACTION_PAGE_SIZE
      && BigInt(last.transaction_id.lt) > BigInt(transfer.startLt ?? '0')
      && last.transaction_id.lt !== transfer.scanLt;

  return {
    transactions,
    cursor: {
      scanLt: hasMore ? last.transaction_id.lt : undefined,
      scanHash: hasMore ? last.transaction_id.hash : undefined,
    },
  };
}
