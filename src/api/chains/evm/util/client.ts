import { FetchRequest, JsonRpcProvider, Network } from 'ethers';

import type { EVMChain } from '../../../types';
import type { ApiNetwork } from '../../../types';

import withCache from '../../../../util/withCache';
import { getBackendHeaders } from '../../../common/backend';
import { EVM_CHAIN_IDS, getEvmRpcUrl } from '../constants';

const MAX_BATCH = 10;

export const getEvmProvider = withCache((network: ApiNetwork, _chain: EVMChain) => {
  const request = new FetchRequest(getEvmRpcUrl(network));
  if (network === 'mainnet') {
    for (const [name, value] of Object.entries(getBackendHeaders())) {
      request.setHeader(name, value);
    }
  }

  return new JsonRpcProvider(request, Network.from(EVM_CHAIN_IDS[network]), {
    staticNetwork: true,
    batchMaxCount: MAX_BATCH,
  });
});

export type EvmProvider = JsonRpcProvider;
