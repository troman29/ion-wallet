import { Address } from '@ton/core';

import { normalizeTonTokenAddress } from './tonAddress';

const canonical = 'EQACbwI38RnvclU5Wv6H9zDr8Ao_tq9NWilXxBmoE8yroZlF';
const address = Address.parse(canonical);

it.each([
  canonical, address.toRawString(), address.toString({ bounceable: false }),
  address.toString({ testOnly: true }), address.toString({ urlSafe: false }),
])('uses one LION identity for configured address %s', (configured) => {
  expect(normalizeTonTokenAddress(configured)).toBe(canonical);
  const previous = process.env.LIQUID_JETTON;
  process.env.LIQUID_JETTON = configured;
  try {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const config = require('../config') as typeof import('../config');
      expect(config.LIQUID_JETTON).toBe(canonical);
      expect(config.STAKED_ION_SLUG).toBe(`ion-${canonical}`);
      expect(config.STAKED_TOKEN_SLUGS.has(`ion-${canonical}`)).toBe(true);
    });
  } finally {
    if (previous === undefined) delete process.env.LIQUID_JETTON;
    else process.env.LIQUID_JETTON = previous;
  }
});

it('preserves the workchain and rejects invalid contract addresses', () => {
  const masterchain = new Address(-1, address.hash);
  expect(Address.parse(normalizeTonTokenAddress(masterchain.toRawString())).equals(masterchain)).toBe(true);
  expect(() => normalizeTonTokenAddress('not-a-contract')).toThrow();
});
