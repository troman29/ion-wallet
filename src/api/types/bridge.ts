import type { ApiBridgeOperation } from './bridgeActivity';

export type ApiBridgeSource = 'ton' | 'bnb';

export interface ApiBridgeQuote {
  accountId: string;
  source: ApiBridgeSource;
  fromAddress: string;
  toAddress: string;
  amount: string;
  receiveAmount: string;
  bridgeFee: string;
  networkFee: string;
  balance: string;
  nativeBalance?: string;
  maxAmount: string;
  expiresAt: number;
}

export interface ApiBridgeSwapData {
  receiver: string;
  amount: string;
  tx: {
    address_: { workchain: number; address_hash: string };
    tx_hash: string;
    lt: string;
  };
}

export type ApiBridgeStatus = 'pending' | 'confirming' | 'waiting' | 'claimable' | 'claiming' | 'completed' | 'failed';

/** Amounts and logical times are decimal strings in persistent storage */
export interface ApiBridgeTransfer extends ApiBridgeQuote {
  serverOperationId?: string;
  serverRevision?: string;
  serverOperation?: ApiBridgeOperation;
  serverSourceTxHash?: string;
  serverDestinationTxHash?: string;
  id: string;
  createdAt: number;
  status: ApiBridgeStatus;
  txId?: string;
  claimTxId?: string;
  claimNetworkFee?: string;

  /** The authorized EVM transaction permits an idempotent retry after a lost broadcast */
  signedEvmTransaction?: string;

  /** Exact authorized external message, persisted before the first broadcast. Contains no private key. */
  nativeSubmission?: {
    boc: string;
    validUntil: number;
    seqno?: number;
  };

  /** Recovery for intents without a persisted signed message */
  nativeRecovery?: {
    validUntil: number;
    sourceConfirmed?: boolean;
    scanLt?: string;
    scanHash?: string;
  };

  /** Sender history boundary captured before signing, independent of the device clock */
  nativeStartLt?: string;

  confirmations?: number;
  votes?: number;
  requiredVotes?: number;
  queryId?: string;
  logIndex?: number;
  swapId?: string;
  swapData?: ApiBridgeSwapData;

  /** Scan cursor and lower bound for the ION bridge's transaction history */
  scanLt?: string;
  scanHash?: string;
  startLt?: string;

  error?: string;
}
