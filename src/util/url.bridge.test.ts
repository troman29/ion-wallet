import { getExplorerTransactionUrl } from './url';

it('links canonical bridge TON hashes without interpreting hexadecimal as base64', () => {
  const hash = '12'.repeat(32);

  expect(getExplorerTransactionUrl('ton', `0x${hash}`)).toBe(getExplorerTransactionUrl('ton', hash));
});
