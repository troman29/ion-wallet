import { JsonRpcProvider, Network } from 'ethers';

import type { EVMChain } from '../../../types';
import type { ApiNetwork } from '../../../types';

import withCache from '../../../../util/withCache';
import { EVM_CHAIN_IDS, getBnbApiUrl } from '../constants';

const MAX_BATCH = 10;

export const getEvmProvider = withCache((network: ApiNetwork, _chain: EVMChain) => {
  return new JsonRpcProvider(`${getBnbApiUrl(network)}/rpc`, Network.from(EVM_CHAIN_IDS[network]), {
    staticNetwork: true,
    batchMaxCount: MAX_BATCH,
  });
});

export type EvmProvider = JsonRpcProvider;
