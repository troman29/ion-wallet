import type { ApiActivity, ApiFetchTransactionByIdOptions, EVMChain } from '../../types';

import { logDebugError } from '../../../util/logs';
import { getEvmProvider } from './util/client';
import { fetchActivitiesByHash } from './activities';

export async function fetchTransactionById(
  chain: EVMChain,
  { network, walletAddress, ...options }: ApiFetchTransactionByIdOptions,
): Promise<ApiActivity[]> {
  if (!('txId' in options)) {
    return [];
  }

  try {
    const address = walletAddress || (await getEvmProvider(network, chain).getTransaction(options.txId))?.from;
    return address ? await fetchActivitiesByHash(chain, network, address, options.txId) : [];
  } catch (err) {
    logDebugError('fetchTransactionById', chain, err);
    return [];
  }
}
