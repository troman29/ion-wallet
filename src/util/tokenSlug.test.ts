import { Address } from '@ton/core';

import { LIQUID_JETTON, STAKED_ION_SLUG } from '../config';
import { normalizeTokenSlug, normalizeTokenSlugKeys } from './tokenSlug';

it.each([
  ['toncoin', 'ioncoin'],
  ['ton-EQabc-def', 'ion-EQabc-def'],
  ['staking-toncoin', 'staking-ioncoin'],
  ['ioncoin', 'ioncoin'],
  ['ion-EQabc-def', 'ion-EQabc-def'],
  ['bnb', 'bnb'],
  ['bnb-0x123', 'bnb-0x123'],
])('normalizes %s to %s idempotently', (oldSlug, newSlug) => {
  expect(normalizeTokenSlug(oldSlug)).toBe(newSlug);
  expect(normalizeTokenSlug(newSlug)).toBe(newSlug);
});

it('preserves canonical values in mixed caches without adding balances or relying on key order', () => {
  expect(normalizeTokenSlugKeys({ toncoin: 10n, ioncoin: 0n, 'ton-EQabc': 20n, 'ion-EQabc': 30n }))
    .toEqual({ ioncoin: 0n, 'ion-EQabc': 30n });
  expect(normalizeTokenSlugKeys({ ioncoin: 0n, toncoin: 10n })).toEqual({ ioncoin: 0n });
});

it('canonicalizes address aliases and retains the canonical balance without double counting', () => {
  const address = Address.parse(LIQUID_JETTON);
  const aliases = [
    address.toRawString(), address.toString({ bounceable: false }),
    address.toString({ testOnly: true }), address.toString({ urlSafe: false }),
  ];
  for (const alias of aliases) {
    expect(normalizeTokenSlug(`ion-${alias}`)).toBe(STAKED_ION_SLUG);
    expect(normalizeTokenSlug(`ton-${alias}`)).toBe(STAKED_ION_SLUG);
    const balances = { [STAKED_ION_SLUG]: 0n, [`ton-${alias}`]: 10n, [`ion-${alias}`]: 20n };
    expect(normalizeTokenSlugKeys(balances)).toEqual({ [STAKED_ION_SLUG]: 0n });
  }
});
