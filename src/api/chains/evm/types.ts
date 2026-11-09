import type { BaseApiTransaction, EVMChain } from '../../types';

export type BnbBalancesResponse = {
  address: string;
  native: string;
  tokens: Record<string, string>;
  asOf: number;
};

export type BnbHistoryItem = {
  id: string;
  hash: string;
  kind: 'native' | 'internal' | 'token';
  token?: string;
  from: string;
  to: string;
  amount: string;
  fee?: string;
  isFailed: boolean;
  timestamp: number;
  blockNumber: number;
};

export type BnbHistoryResponse = {
  items: BnbHistoryItem[];
  hasMore: boolean;
  isBackfilling: boolean;
};

export type BnbApproval = {
  token: string;
  spender: string;
  amount: string;
  blockNumber: number;
  timestamp: number;
  hash: string;
};

export type EvmWatchedWallet = {
  address: string;
  chain: EVMChain;
};

export type EvmSubscriptionType =
  | 'native'
  | 'erc20_in'
  | 'erc20_out'
  | 'erc721_in'
  | 'erc721_out'
  | 'erc1155_in'
  | 'erc1155_out';

export type EvmNftTransferEvent = {
  contractAddress: string;
  from: string;
  to: string;
  tokenType: 'erc721' | 'erc1155';
  /** `undefined` for ERC-1155 TransferBatch — a full poll is required in that case */
  tokenId?: string;
};

export type EthSubscribeRequest = {
  jsonrpc: '2.0';
  id: string;
  method: 'eth_subscribe';
  params:
    | [
      'alchemy_minedTransactions',
      {
        addresses: {
          from?: string;
          to?: string;
        }[];
        includeRemoved: boolean;
        hashesOnly: boolean;
      },
    ]
    | [
      'logs',
      {
        topics: (string | string[] | null | undefined)[];
      },
    ];
};

export type EthUnsubscribeRequest = {
  jsonrpc: '2.0';
  id: string;
  method: 'eth_unsubscribe';
  params: [string];
};

export type AlchemySocketClientMessage = EthSubscribeRequest | EthUnsubscribeRequest;

export type EthSubscribeResultMessage = {
  jsonrpc: '2.0';
  id: string;
  result: string;
};

export type EthUnsubscribeResultMessage = {
  jsonrpc: '2.0';
  id: string;
  result: boolean;
};

export type MinedTransactionNotification = {
  removed?: boolean;
  transaction: {
    accessList: string[];
    blockHash: string;
    blockNumber: string;
    chainId: string;
    from: string;
    gas: string;
    gasPrice: string;
    hash: string;
    input: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    nonce: string;
    r: string;
  };
};

export type LogNotification = {
  address: string;
  topics: string[];
  data?: string;
  removed?: boolean;
};

export type EthSubscriptionMessage = {
  jsonrpc: '2.0';
  method: 'eth_subscription';
  params: {
    subscription: string;
    result: MinedTransactionNotification | LogNotification;
  };
};

export type AlchemySocketServerMessage =
  | EthSubscribeResultMessage
  | EthUnsubscribeResultMessage
  | EthSubscriptionMessage;

export type EvmTokenOperation = {
  assets: string[];
  transfer: BaseApiTransaction;
};
