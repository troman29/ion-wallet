import type { ApiNetwork } from '../../types';

import { BNB_TESTNET_RPC_URL, BRILLIANT_API_BASE_URL } from '../../../config';

/** Safety multiplier applied to the estimated gas fee when sending the max native balance */
export const EVM_MAX_TRANSFER_FEE_MULTIPLIER = 1.5;

export const EVM_DEFAULT_DERIVATION_PATH = `m/44'/60'/0'/0/0`;

export const EVM_DERIVATION_PATHS = {
  default: `m/44'/60'/0'/0/{index}`,
  legacy: `m/44'/60'/0'/{index}`,
  alt: `m/44'/60'/0'`,
} as const;

export const EVM_MAX_NUMBER = 2n ** 256n - 1n;

export function getEvmRpcUrl(network: ApiNetwork) {
  return network === 'mainnet' ? `${BRILLIANT_API_BASE_URL}/bnb/rpc` : BNB_TESTNET_RPC_URL;
}

export const EVM_CHAIN_IDS: Record<ApiNetwork, number> = { mainnet: 56, testnet: 97 };

export const EVM_DALEGATOR_ADDRESSES: Record<string, string> = {
  '0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00': 'Uniswap',
  '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b': 'Metamask',
  '0x69007702764179f14F51cdce752f4f775d74E139': 'Alchemy',
  '0x5A7FC11397E9a8AD41BF10bf13F22B0a63f96f6d': 'Ambire',
  '0xD2e28229F6f2c235e57De2EbC727025A1D0530FB': 'Trust Wallet',
  '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9': 'Eth Foundation',
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
