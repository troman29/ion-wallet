import { Contract } from 'ethers';

import type { ApiNetwork } from '../types';

import { BRIDGE_ABI, BRIDGE_CONFIG } from './config';
import { getEvmProvider } from '../chains/evm/util/client';
import { fetchStoredAccount } from '../common/accounts';

export async function getBridgeAccount(accountId: string) {
  const account = await fetchStoredAccount(accountId);
  if (account.type === 'view' || !account.byChain.ton || !account.byChain.bnb) {
    throw new Error('Bridge requires an ION and BNB wallet in the same account.');
  }

  return { ion: account.byChain.ton.address, bnb: account.byChain.bnb.address };
}

export function getBridgeContract(network: ApiNetwork) {
  return new Contract(BRIDGE_CONFIG[network].token, BRIDGE_ABI, getEvmProvider(network, 'bnb'));
}
