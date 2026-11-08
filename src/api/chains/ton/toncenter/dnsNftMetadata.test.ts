import type { AnyAction, MetadataMap } from './types';

jest.mock('./other', () => ({ callToncenterV3: jest.fn() }));

const DNS_COLLECTION_RAW = '0:FE4F44C57DE98A920AB6182B8A7ECB82261B39EB05437EA5D20A2EB94EBCD915';
const OTHER_COLLECTION_RAW = '0:1DBD7D6DA27267ACF323F064E2E2A877D25820D62A9B9CA4E44CA6AA69A08465';
const DOMAIN_ITEM_RAW = '0:A32EF17074C4B3C8EB69F6DF54A2044BCA8EB834025DEEB3382410198CB45DFF';
const OTHER_ITEM_RAW = '0:29629EBBC00A87286A4B04DA125A9C0318E9017EE118F0C04FEDCD52AE54B158';

const ACTIONS = [
  { type: 'nft_transfer', details: { nft_item: DOMAIN_ITEM_RAW } },
  { type: 'renew_dns', details: { asset: DOMAIN_ITEM_RAW } },
  { type: 'nft_transfer', details: { nft_item: OTHER_ITEM_RAW } },
] as unknown as AnyAction[];

const NFT_ITEMS_RESPONSE = {
  nft_items: [
    {
      address: DOMAIN_ITEM_RAW,
      collection_address: DNS_COLLECTION_RAW,
      content: { uri: 'https://dns.ice.io/meta/item-testtesttest.json' },
    },
    {
      address: OTHER_ITEM_RAW,
      collection_address: OTHER_COLLECTION_RAW,
      content: { uri: 'https://example.com/meta/item-testtesttest.json' },
    },
  ],
};

describe('fillDnsNftMetadata', () => {
  let fill: typeof import('./dnsNftMetadata').fillDnsNftMetadata;
  let callToncenterV3Mock: jest.Mock;

  // The name cache lives in the module, so every test gets a fresh one
  beforeEach(() => {
    jest.resetModules();
    fill = jest.requireActual<typeof import('./dnsNftMetadata')>('./dnsNftMetadata').fillDnsNftMetadata;
    callToncenterV3Mock = jest.requireMock<{ callToncenterV3: jest.Mock }>('./other').callToncenterV3;
  });

  it('names the DNS items of the actions and leaves the other NFTs alone', async () => {
    callToncenterV3Mock.mockResolvedValue(NFT_ITEMS_RESPONSE);
    const metadata: MetadataMap = {};

    await fill('mainnet', ACTIONS, metadata);

    expect(metadata[DOMAIN_ITEM_RAW]).toEqual({
      is_indexed: true,
      token_info: [{ type: 'nft_items', name: 'testtesttest.ion' }],
    });
    expect(metadata[OTHER_ITEM_RAW]).toBeUndefined();
    expect(callToncenterV3Mock).toHaveBeenCalledTimes(1);
  });

  it('asks the indexer about an item only once', async () => {
    callToncenterV3Mock.mockResolvedValue(NFT_ITEMS_RESPONSE);

    await fill('mainnet', ACTIONS, {});
    const metadata: MetadataMap = {};
    await fill('mainnet', ACTIONS, metadata);

    expect(callToncenterV3Mock).toHaveBeenCalledTimes(1);
    expect(metadata[DOMAIN_ITEM_RAW]).toBeDefined();
  });

  it('keeps the history when the indexer fails', async () => {
    callToncenterV3Mock.mockRejectedValue(new Error('offline'));
    const metadata: MetadataMap = {};

    await expect(fill('mainnet', ACTIONS, metadata)).resolves.toBeUndefined();
    expect(metadata).toEqual({});
  });
});
