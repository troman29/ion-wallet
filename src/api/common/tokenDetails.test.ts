import { buildTokenDetails } from './tokenDetails';

it('supports a total volume without inventing a buy/sell split', () => {
  expect(buildTokenDetails({ volume24h: { total: 150 } }).volume24h).toEqual({ total: 150 });
});

it('accepts zero supply and zero volume, and converts percentage units', () => {
  expect(buildTokenDetails({
    marketCap: 0, supply: { circulating: 0, total: 0 },
    volume24h: { buy: 0, sell: 0, percentChange: -12 },
  })).toMatchObject({
    marketCap: 0, circulatingSupply: 0, totalSupply: 0,
    volume24h: { total: 0, buy: 0, sell: 0, change: -0.12 },
  });
});

it('omits invalid numbers and dates instead of rendering them as zero', () => {
  expect(buildTokenDetails({
    marketCap: NaN, supply: { circulating: -1, total: Infinity },
    createdAt: 'invalid', volume24h: { total: -1, buy: NaN },
  })).toMatchObject({
    marketCap: undefined, circulatingSupply: undefined, totalSupply: undefined,
    createdAt: undefined, volume24h: undefined,
  });
});

it('prefers the translation and accepts only safe public links in the original order', () => {
  expect(buildTokenDetails({
    description: 'English', localizedDescription: 'Русский',
    links: [
      { url: 'https://ice.io' }, { type: 'telegram', url: 'https://t.me/iceblockchain' },
      { type: 'x', url: 'https://x.com/ice_blockchain' }, { url: 'javascript:alert(1)' },
    ],
  })).toMatchObject({
    description: 'Русский', links: [
      { kind: 'x', url: 'https://x.com/ice_blockchain' },
      { kind: 'telegram', url: 'https://t.me/iceblockchain' },
      { kind: 'website', url: 'https://ice.io' },
    ],
  });
});

it('preserves every supported social network kind', () => {
  const links = [
    { type: 'telegram', url: 'https://t.me/iceblockchain' },
    { type: 'x', url: 'https://x.com/ice_blockchain' },
    { type: 'facebook', url: 'https://www.facebook.com/ice.blockchain' },
    { type: 'instagram', url: 'https://www.instagram.com/ice.blockchain' },
    { type: 'linkedin', url: 'https://www.linkedin.com/company/ice-blockchain' },
    { type: 'tiktok', url: 'https://www.tiktok.com/@ice.blockchain' },
    { type: 'youtube', url: 'https://www.youtube.com/@ice.blockchain' },
    { type: 'reddit', url: 'https://www.reddit.com/r/iceblockchain' },
  ] as const;
  const normalized = buildTokenDetails({ links: [...links] }).links!;
  expect(normalized).toHaveLength(8);
  for (const { type, url } of links) expect(normalized).toContainEqual({ kind: type, url });
});
