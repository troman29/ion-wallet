/*
 * This file is chain-agnostic, i.e. it doesn't contain any TON or other chain types.
 */

import type { ExplainedTransferFee } from '../../util/fee/transferFee';
import type { ApiAnyDisplayError } from './errors';
import type { ApiLocalTransactionParams } from './misc';

export type ApiTransferPayload =
  | { type: 'comment'; text: string; shouldEncrypt?: boolean }
  | { type: 'binary'; data: Uint8Array }
  | { type: 'base64'; data: string };

interface ApiTransactionCommonOptions {
  accountId: string;
  toAddress: string;
  /**
   * When the value is undefined, the method doesn't check the available balance. If you want only to estimate the fee,
   * don't send the amount, because:
   * - The fee doesn't depend on the amount neither in TON nor in TRON.
   * - Errors will happen in edge cases such as 0 and greater than the balance.
   */
  amount?: bigint;
  payload?: ApiTransferPayload;
  /** Base64 */
  stateInit?: string;
  // For token transfer
  tokenAddress?: string;
}

export type ApiCheckTransactionDraftOptions = ApiTransactionCommonOptions;

export interface ApiSubmitTransferOptions extends ApiSubmitGasfullTransferOptions {
  /**
   * The real fee (from `explainedFee.realFee.nativeSum`) to show in the created local transaction.
   */
  realFee?: bigint;
}

export interface ApiSubmitGasfullTransferOptions extends ApiTransactionCommonOptions {
  /** Required only for mnemonic accounts */
  enclaveToken?: string;
  amount: bigint;
  /** To cap the fee in TRON transfers */
  fee?: bigint;
  noFeeCheck?: boolean;
}

export interface ApiCheckTransactionDraftResult {
  addressName?: string;
  isScam?: boolean;
  resolvedAddress?: string;
  isToAddressNew?: boolean;
  isBounceable?: boolean;
  isMemoRequired?: boolean;
  error?: ApiAnyDisplayError;
  /** Normalized explanation of the fee for this draft, ready for UI consumption. */
  explainedFee?: ExplainedTransferFee;
}

export interface ApiSubmitGasfullTransferResult {
  txId?: string;

  /**
   * The fields that are necessary to add to the local activity (`ApiTransactionActivity`), excluding fields that the
   * method caller can fill by themselves.
   */
  localActivityParams?: Partial<Omit<ApiLocalTransactionParams, 'id' | 'normalizedAddress'>>;
  /** The backend requires it when selling TON or TON tokens currently */
  msgHashForCexSwap?: string;
}

export type ApiSubmitNftTransferResult = {
  transfers: { toAddress: string }[];
  msgHashNormalized: string;
} | {
  error: string;
};
