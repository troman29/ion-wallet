import { Address } from '@ton/core';
import Dexie from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { deserialize, serialize } from 'node:v8';

import { LIQUID_JETTON, STAKED_ION_SLUG } from '../../config';
import { ApiDb } from './dexie';

const previousDependencies = { ...Dexie.dependencies };
const previousStructuredClone = global.structuredClone;
let oldDb: Dexie;
let newDb: ApiDb;

beforeEach(() => {
  Dexie.dependencies.indexedDB = new IDBFactory();
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
  global.structuredClone = (value) => deserialize(serialize(value));
  oldDb = new Dexie('tables');
  newDb = new ApiDb();
});

afterEach(async () => {
  oldDb.close();
  await newDb.delete();
  Object.assign(Dexie.dependencies, previousDependencies);
  global.structuredClone = previousStructuredClone;
});

it('upgrades v7 tokens without losing metadata or changing chain IDs', async () => {
  oldDb.version(7).stores({ tokens: 'tokenAddress, chain, &slug' });
  const tokens = [
    {
      tokenAddress: LIQUID_JETTON, chain: 'ton', slug: `ton-${LIQUID_JETTON}`,
      name: 'Liquid ION', symbol: 'LION', decimals: 9, priceUsd: 2, isFromBackend: true,
    },
    { tokenAddress: 'EQcustom', chain: 'ton', slug: 'ton-EQcustom', name: 'Imported token', image: 'kept' },
    { tokenAddress: '0x123', chain: 'bnb', slug: 'bnb-0x123', name: 'BEP-20' },
  ];
  await oldDb.open();
  await oldDb.table('tokens').bulkPut(tokens);
  oldDb.close();

  await newDb.open();
  expect(newDb.verno).toBe(8);
  const expected = [
    { ...tokens[0], slug: STAKED_ION_SLUG },
    { ...tokens[1], slug: 'ion-EQcustom' },
    tokens[2],
  ];
  expect(await newDb.tokens.toArray()).toEqual(expect.arrayContaining(expected));
  expect(await newDb.tokens.count()).toBe(3);
  expect(await newDb.tokens.where('slug').equals(`ton-${LIQUID_JETTON}`).count()).toBe(0);

  newDb.close();
  await newDb.open();
  expect(await newDb.tokens.toArray()).toEqual(expect.arrayContaining(expected));
});

it.each([false, true])(
  'merges conflicting slug and address aliases (reverse input: %s)',
  async (reverse) => {
    oldDb.version(7).stores({ tokens: 'tokenAddress, chain, &slug' });
    const address = Address.parse(LIQUID_JETTON);
    const nonBounceable = address.toString({ bounceable: false });
    const legacy = {
      tokenAddress: reverse ? nonBounceable : address.toRawString(), chain: 'ton', slug: `ton-${LIQUID_JETTON}`,
      name: 'Legacy LION', priceUsd: 2, image: 'kept.svg', codeHash: 'legacy', isFromBackend: true,
    };
    const canonical = {
      tokenAddress: reverse ? address.toRawString() : nonBounceable, chain: 'ton', slug: STAKED_ION_SLUG,
      name: 'Canonical LION', priceUsd: 3, codeHash: 'canonical', image: undefined,
    };
    const alias = {
      tokenAddress: LIQUID_JETTON, chain: 'ton', slug: `ion-${nonBounceable}`, color: 'green',
    };
    const bnb = { tokenAddress: '0x123', chain: 'bnb', slug: 'bnb-0x123', priceUsd: 4 };
    const tokens = [legacy, canonical, alias, bnb];
    await oldDb.open();
    await oldDb.table('tokens').bulkPut(reverse ? tokens.reverse() : tokens);
    oldDb.close();

    await newDb.open();
    expect(await newDb.tokens.toArray()).toEqual(expect.arrayContaining([
      {
        ...legacy, ...canonical, color: 'green', image: 'kept.svg',
        tokenAddress: LIQUID_JETTON, slug: STAKED_ION_SLUG,
      },
      bnb,
    ]));
    expect(await newDb.tokens.count()).toBe(2);
    expect(await newDb.tokens.get(nonBounceable)).toBeUndefined();
    expect(await newDb.tokens.get(address.toRawString())).toBeUndefined();
  },
);

it('rolls back the original table and database version if writing the merged records fails', async () => {
  oldDb.version(7).stores({ tokens: 'tokenAddress, chain, &slug' });
  const token = { tokenAddress: LIQUID_JETTON, chain: 'ton', slug: `ton-${LIQUID_JETTON}`, priceUsd: 2 };
  await oldDb.open();
  await oldDb.table('tokens').put(token);
  oldDb.close();

  const write = jest.spyOn(Object.getPrototypeOf(newDb.tokens), 'bulkPut')
    .mockRejectedValue(new Error('Migration write failed'));
  try {
    await expect(newDb.open()).rejects.toThrow('Migration write failed');
    expect(write).toHaveBeenCalled();
  } finally {
    write.mockRestore();
  }
  await oldDb.open();
  expect(oldDb.verno).toBe(7);
  expect(await oldDb.table('tokens').toArray()).toEqual([token]);
});
