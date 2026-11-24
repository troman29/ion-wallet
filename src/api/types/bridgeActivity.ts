import type { ApiBridgeSource, ApiBridgeStatus, ApiBridgeSwapData } from './bridge';
import type { ApiNetwork } from './misc';

export interface ApiBridgeTransactionRef {
  chain: ApiBridgeSource;
  hash: string;
  lt?: string;
  blockHash?: string;
  blockNumber?: number;
  logIndex?: number;
  messageHash?: string;
  externalMsgHashNorm?: string;
}

export interface ApiBridgeComponent extends ApiBridgeTransactionRef {
  role: 'source' | 'destination' | 'ack' | 'fee';
  fromAddress?: string;
  toAddress?: string;
  amount?: string;
  token?: string;
}

export interface ApiBridgeFee {
  chain: ApiBridgeSource;
  amount: string;
  payer: string;
  transactionHash: string;
}

/** Public on-chain evidence; signing and recovery data belong to local bridge intents. */
export interface ApiBridgeOperation {
  id: string;
  revision: string;
  network: ApiNetwork;
  source: ApiBridgeSource;
  fromAddress: string;
  toAddress: string;
  amount: string;
  receiveAmount: string;
  bridgeFee?: string;
  timestamp: number;
  status: ApiBridgeStatus;
  swapId?: string;
  swapData?: ApiBridgeSwapData;
  sourceTransaction?: ApiBridgeTransactionRef;
  destinationTransaction?: ApiBridgeTransactionRef;
  components: ApiBridgeComponent[];
  fees: ApiBridgeFee[];
}

export interface ApiBridgeOperationPage {
  items: ApiBridgeOperation[];
  nextCursor?: string;
  hasMore: boolean;
  syncCursor: string;
  isBackfilling: boolean;
}

export interface ApiBridgeOperationChanges {
  items: ApiBridgeOperation[];
  removedIds: string[];
  nextCursor: string;
  hasMore: boolean;
  isBackfilling: boolean;
}
