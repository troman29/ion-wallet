const mockFetchNftByAddress = jest.fn();

jest.mock('../chains/ton/toncenter/nfts', () => ({
  fetchNftByAddress: (...args: unknown[]) => mockFetchNftByAddress(...args),
}));

import { fetchNftByAddress } from './nfts';

const NFT_ADDRESS = 'EQBtqQlC09xW_oOHJOrMofDmFndOrY7zCjd7bYELIoabO9JC';

describe('NFT methods', () => {
  afterEach(() => {
    mockFetchNftByAddress.mockReset();
  });

  describe('fetchNftByAddress', () => {
    it('serves the NFT loaded by the chain', async () => {
      const parsedNft = { address: NFT_ADDRESS, name: 'Parsed NFT' };
      mockFetchNftByAddress.mockResolvedValue(parsedNft);

      const result = await fetchNftByAddress('ton', 'mainnet', NFT_ADDRESS);

      expect(mockFetchNftByAddress).toHaveBeenCalledWith('mainnet', NFT_ADDRESS);
      expect(result).toBe(parsedNft);
    });
  });
});
