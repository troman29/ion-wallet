import { Address, beginCell } from '@ton/core';

import type { ApiTokensBurnPayload } from '../../../types';

import { LIQUID_JETTON, LIQUID_POOL } from '../../../../config';
import { JettonOpCode, LiquidStakingOpCode } from '../constants';

import { parseLiquidStakingRequest } from './LiquidStaking';

const owner = Address.parse('UQA4ig8gg06oYwMPvgsLBbk0h00OhPiTAEMA4UdiiLBwt7nj');
const jettonWallet = LIQUID_JETTON;

function burnPayload(amount: bigint, waitTillRoundEnd: boolean) {
  const flags = beginCell().storeBit(waitTillRoundEnd).storeBit(false).endCell();
  return beginCell()
    .storeUint(JettonOpCode.Burn, 32)
    .storeUint(10001, 64)
    .storeCoins(amount)
    .storeAddress(owner)
    .storeMaybeRef(flags)
    .endCell()
    .toBoc()
    .toString('base64');
}

function parsedBurn(amount: bigint): ApiTokensBurnPayload {
  return {
    type: 'tokens:burn',
    queryId: 10001n,
    amount,
    address: owner.toString(),
    slug: 'ton-liquid',
    isLiquidUnstakeRequest: true,
  };
}

it('reads a stake request only for the ION pool', () => {
  const body = beginCell().storeUint(LiquidStakingOpCode.Deposit, 32).storeUint(10001, 64)
    .endCell().toBoc().toString('base64');
  const payload = { type: 'liquid-staking:deposit' as const, queryId: 10001n };
  expect(parseLiquidStakingRequest(LIQUID_POOL, body, payload)).toEqual({ operation: 'stake' });
  expect(parseLiquidStakingRequest(owner.toString(), body, payload)).toBeUndefined();
});

it.each([1_000_000_000n, 7_000_000_000n])('reads full and partial burn quantities: %s', (amount) => {
  expect(parseLiquidStakingRequest(jettonWallet, burnPayload(amount, false), parsedBurn(amount))).toEqual({
    operation: 'unstake',
    jettonAmount: amount,
    waitTillRoundEnd: false,
    fillOrKill: false,
  });
});

it('reads a direct pool withdrawal body', () => {
  const amount = 500_000_000_000n;
  const body = beginCell()
    .storeUint(LiquidStakingOpCode.Withdraw, 32)
    .storeUint(0, 64)
    .storeCoins(amount)
    .storeAddress(owner)
    .storeAddress(owner)
    .endCell().toBoc().toString('base64');
  expect(parseLiquidStakingRequest(LIQUID_POOL, body, undefined, owner.toString())).toEqual({
    operation: 'unstake', jettonAmount: amount,
  });
  expect(parseLiquidStakingRequest(LIQUID_POOL, body, undefined, LIQUID_POOL)).toBeUndefined();
});

it('does not label an unrelated jetton burn as staking', () => {
  expect(parseLiquidStakingRequest(jettonWallet, burnPayload(1n, false), {
    ...parsedBurn(1n), isLiquidUnstakeRequest: false,
  })).toBeUndefined();
});
