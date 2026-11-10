import type { ApiNetwork, EVMChain } from '../../../types';
import { EVM_CHAIN_IDS } from '../../../dappProtocols/adapters/walletConnect/types';

export function getIsEvmTransactionChainValid(chainId: bigint, chain: EVMChain, network: ApiNetwork): boolean {
  const expected = EVM_CHAIN_IDS[`eip155:${chainId}`];
  return expected?.chain === chain && expected.network === network;
}
