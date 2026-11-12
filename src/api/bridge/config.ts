import type { ApiNetwork } from '../types';

export const BRIDGE_CONFIG = {
  mainnet: {
    token: '0xE1ab61f7b093435204dF32F5b3A405de55445Ea8',
    bridge: 'Ef8PSnTugXPqSS9HgrEWdrU1yOoy2wH4qCaqsZhCaV2HSNz1',
    collector: 'EQDlW12QNTNlGp-t4mGd8mvv3XrRWGRj73oWdBcQlJP_zpoB',
    multisig: 'kf876m_BZ0VacBr51rlq51XStwkAYpqEiwAkkW50XWR__s6E',
  },
  testnet: {
    token: '0xc632928ab4fc995e04b4d66da62c28ce56e2bd73',
    bridge: 'Ef_NdjdsgD5S7hQijVXBrGGI6mqp9dZnToJCD8CzkFOwAvWL',
    collector: 'EQB91-zbCZDGGtVngKdyXB7Cnbm_DKVXJQsHyzDn3cZSFEuI',
    multisig: 'kf-sw1ve4zYbX7-48loRWut-HNyVq65NbkRueXFETpcUvLDT',
  },
} satisfies Record<ApiNetwork, {
  token: string;
  bridge: string;
  collector: string;
  multisig: string;
}>;

export const BRIDGE_MIN_AMOUNT = 10_000_000_000n;
export const BRIDGE_CONFIRMATIONS = 12;
export const BRIDGE_QUOTE_TTL = 60_000;
export const BRIDGE_TRANSACTION_PAGE_SIZE = 50;

const SWAP_DATA
  = '(address receiver,uint64 amount,((int8 workchain,bytes32 address_hash) address_,bytes32 tx_hash,uint64 lt) tx)';

export const BRIDGE_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowBurn() view returns (bool)',
  'function burn(uint256 amount,(int8 workchain,bytes32 address_hash) addr)',
  'function getFullOracleSet() view returns (address[])',
  'function finishedVotings(bytes32) view returns (bool)',
  `function getSwapDataId(${SWAP_DATA} data) view returns (bytes32)`,
  `function voteForMinting(${SWAP_DATA} data,(address signer,bytes signature)[] signatures)`,
  'event SwapEthToIon(address indexed from,int8 to_wc,bytes32 indexed to_addr_hash,uint256 value)',
];
