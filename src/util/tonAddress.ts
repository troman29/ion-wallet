import { Address } from '@ton/core/dist/address/Address';

/** Token identities use URL-safe bounceable addresses, independent of the wallet's selected network. */
export function normalizeTonTokenAddress(address: string) {
  return Address.parse(address.trim()).toString({ urlSafe: true, bounceable: true, testOnly: false });
}
