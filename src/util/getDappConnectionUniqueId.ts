import type { StoredDappConnection } from '../api/dappProtocols/storage';
import type { ApiDappRequest } from '../api/types';
import { DappProtocolType } from '../api/dappProtocols/types';

const JS_BRIDGE_ID = 'jsbridge';
// A site in the in-app browser can be connected over TonConnect and the injected EVM provider at once
// (the ION-BSC bridge is), so the two connections must not overwrite each other
export const EVM_JS_BRIDGE_ID = 'jsbridge:walletConnect';

export function getDappConnectionUniqueId(
  request: ApiDappRequest | StoredDappConnection,
  protocolType: DappProtocolType | undefined = (request as StoredDappConnection).protocolType,
): string {
  return (request as ApiDappRequest).sseOptions?.appClientId
    || (request as StoredDappConnection).sse?.appClientId
    || (request as StoredDappConnection).wcPairingTopic
    || (protocolType === DappProtocolType.WalletConnect ? EVM_JS_BRIDGE_ID : JS_BRIDGE_ID);
}
