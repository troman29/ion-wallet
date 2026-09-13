import type { DeviceModelId } from '@ledgerhq/devices';

import type { ApiChain, ApiLedgerDriver } from './misc';
import type { ApiWalletByChain } from './storage';

// Only the fields used by the app are retained from DeviceModel.
export type ApiLedgerDeviceModel = null | undefined | {
  id: DeviceModelId;
  productName: string;
};

export interface ApiLedgerAccountInfo {
  byChain: {
    [K in ApiChain]?: ApiWalletByChain[K];
  };
  driver: ApiLedgerDriver;
  deviceId?: string;
  deviceName?: string;
}

export interface ApiLedgerWalletInfo<T extends ApiChain = ApiChain> extends Omit<ApiLedgerAccountInfo, 'byChain'> {
  balance: bigint;
  wallet: ApiWalletByChain[T];
}
