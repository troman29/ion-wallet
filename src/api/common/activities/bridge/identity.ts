import { Address } from '@ton/core';

import type { ApiChain } from '../../../types';

export function normalizeBridgeAddress(address: string, chain: ApiChain) {
  if (chain === 'bnb') return address.toLowerCase();

  try {
    return Address.parse(address).toRawString();
  } catch {
    return address;
  }
}

export function normalizeBridgeHash(hash: string) {
  const hex = hash.replace(/^0x/, '');
  return /^[\da-f]{64}$/i.test(hex) ? hex.toLowerCase() : Buffer.from(hash, 'base64').toString('hex');
}
