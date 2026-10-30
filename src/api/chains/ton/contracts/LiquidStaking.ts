import type { Slice } from '@ton/core';
import { Address, Cell } from '@ton/core';

import type { ApiParsedPayload } from '../../../types';

import { LIQUID_POOL } from '../../../../config';
import { JettonOpCode, LiquidStakingOpCode } from '../constants';

export type LiquidStakingRequest = {
  operation: 'stake' | 'unstake';
  jettonAmount?: bigint;
  waitTillRoundEnd?: boolean;
  fillOrKill?: boolean;
};

export function parsePoolWithdrawal(slice: Slice) {
  const jettonAmount = slice.loadCoins();
  const fromAddress = slice.loadAddress();
  const responseAddress = slice.loadAddress();
  return { jettonAmount, fromAddress, responseAddress };
}

/** Reads the pool and jetton-wallet message bodies used by ION liquid staking. */
export function parseLiquidStakingRequest(
  toAddress: string,
  rawPayload: string | undefined,
  parsedPayload: ApiParsedPayload | undefined,
  walletAddress?: string,
): LiquidStakingRequest | undefined {
  if (!rawPayload) return undefined;

  try {
    const isPool = Address.parse(toAddress).equals(Address.parse(LIQUID_POOL));
    const body = Cell.fromBase64(rawPayload).beginParse();
    const op = body.loadUint(32) as JettonOpCode | LiquidStakingOpCode;
    body.loadUintBig(64); // query_id

    if (isPool && op === LiquidStakingOpCode.Deposit && parsedPayload?.type === 'liquid-staking:deposit') {
      return { operation: 'stake' };
    }

    if (isPool && op === LiquidStakingOpCode.Withdraw) {
      const { jettonAmount, fromAddress, responseAddress } = parsePoolWithdrawal(body);
      if (walletAddress && (!fromAddress.equals(Address.parse(walletAddress))
        || !responseAddress.equals(Address.parse(walletAddress)))) return undefined;
      if (jettonAmount > 0n) return { operation: 'unstake', jettonAmount };
    }

    if (op === JettonOpCode.Burn && parsedPayload?.type === 'tokens:burn'
      && parsedPayload.isLiquidUnstakeRequest) {
      const jettonAmount = body.loadCoins();
      const responseAddress = body.loadAddress();
      if (walletAddress && !responseAddress.equals(Address.parse(walletAddress))) return undefined;
      const customPayload = body.loadMaybeRef();
      if (jettonAmount !== parsedPayload.amount || jettonAmount <= 0n) return undefined;
      const flags = customPayload?.beginParse();
      return {
        operation: 'unstake',
        jettonAmount,
        waitTillRoundEnd: flags?.remainingBits ? flags.loadBoolean() : undefined,
        fillOrKill: flags?.remainingBits ? flags.loadBoolean() : undefined,
      };
    }
  } catch {
    // Keep an unrecognized body as a regular dapp transfer.
  }

  return undefined;
}
