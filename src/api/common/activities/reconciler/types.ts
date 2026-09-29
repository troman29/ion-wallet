import type { ApiActivity, ApiChain } from '../../../types';

type ReconciliationStatus = 'local' | 'pending' | 'pendingTrusted' | 'confirmed' | 'completed' | 'failed';

export type WalletOperationIntent = {
  operationId: string;
  accountId: string;
  kind: 'swap';

  createdAt: number;
  status: ReconciliationStatus | 'expired';

  from?: {
    slug: string;
    amount: bigint | string;
    chain?: ApiChain;
  };

  to?: {
    slug: string;
    amount?: bigint | string;
    chain?: ApiChain;
  };

  swap?: {
    type: 'cex' | 'dex' | 'tonAggregator' | 'crosschain';
    backendSwapId?: string;
    cexTransactionId?: string;
    expectedTraceId?: string;
    expectedExternalMsgHashNorm?: string;
    submittedHashes?: string[];
  };
};

export type ReconciledActivitiesPatch = {
  accountId: string;
  upsert: ApiActivity[];
  removeIds: string[];
  replacedIds?: Record<string, string>;
};

export type ActivityMatchKeyType =
  | 'operationId'
  | 'backendSwapId'
  | 'cexTransactionId'
  | 'sourceId'
  | 'activityId'
  | 'txHash'
  | 'externalMsgHashNorm'
  | 'traceId'
  | 'submittedHash';

export type ActivityMatchKey = {
  type: ActivityMatchKeyType;
  value: string;
  priority: number;
};

export type ActivityMatch = {
  id: string;
  matchedId: string;
  key: ActivityMatchKey;
};
