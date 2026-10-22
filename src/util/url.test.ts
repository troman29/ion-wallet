import { getChainConfig } from './chain';
import {
  convertExplorerUrl, getExplorerAddressUrl, getExplorerName, getExplorerNftCollectionUrl, getExplorerNftUrl,
  getExplorerTokenUrl, getExplorerTransactionUrl, getMarketplaceNftCollectionUrl, getMarketplaceNftUrl,
  getViewAccountUrl, isInIframeWhitelist, isValidUrl, normalizeUrl,
} from './url';

// Test constants
const TEST_TON_ADDRESS = 'EQAIsixsrb93f9kDyplo_bK5OdgW5r0WCcIJZdGOUG1B282S';
const TEST_EVM_ADDRESS = '0x9429C8Af1089efD542b313156Af2DFA35c7e0a81';
const TEST_TON_HASH = 'cd3547d822b1f33e5825572709b9ac95e64d46680cde5fc6e5ae489ecec83b27';
const TEST_NFT_ADDRESS = 'EQCchzdeVwH5js22ReWU7smONvgpB9bZG9k_VEmYmGhIhuTL';
const TEST_NFT_COLLECTION_ADDRESS = 'EQCQE2L9hfwx1V8sgmF9keraHx1rNK9VmgR1ctVvINBGykyM';

describe('isValidUrl', () => {
  it('should return true for valid urls', () => {
    expect(isValidUrl('https://www.google.com')).toBe(true);
    expect(isValidUrl('http://localhost')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://what-about-non-ascii.рф')).toBe(true);
    expect(isValidUrl('http://127.0.0.1:3000')).toBe(true);
  });

  it('should return false for invalid urls', () => {
    expect(isValidUrl('https://fragment')).toBe(false);
    expect(isValidUrl('https://@push')).toBe(false);
    expect(isValidUrl('https://what is push?')).toBe(false);
    expect(isValidUrl('https://what is push.')).toBe(false);
    expect(isValidUrl('javascript:alert("Hello, world!")')).toBe(false);
    // eslint-disable-next-line @stylistic/max-len
    expect(isValidUrl('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20onload%3D%27alert(1)%27%3E%3C%2Fsvg%3E')).toBe(false);
    expect(isValidUrl('file://localhost/path/to/file')).toBe(false);
  });
});

describe('normalizeUrl', () => {
  it('should add https:// prefix when protocol is missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('my.tt/view/?ton=123')).toBe('https://my.tt/view/?ton=123');
    expect(normalizeUrl('subdomain.example.com/path')).toBe('https://subdomain.example.com/path');
  });

  it('should convert http:// to https://', () => {
    expect(normalizeUrl('http://example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://my.tt/view/?ton=123')).toBe('https://my.tt/view/?ton=123');
  });

  it('should not modify URLs that already have https:// protocol', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('https://my.tt/view/?ton=123&bnb=456')).toBe('https://my.tt/view/?ton=123&bnb=456');
  });

  it('should handle URLs with query parameters and fragments', () => {
    expect(normalizeUrl('example.com/path?query=value#fragment'))
      .toBe('https://example.com/path?query=value#fragment');
    const deeplinkUrl = `my.tt/view/?ton=${TEST_TON_ADDRESS}&bnb=${TEST_EVM_ADDRESS}`;
    const expectedUrl = `https://my.tt/view/?ton=${TEST_TON_ADDRESS}&bnb=${TEST_EVM_ADDRESS}`;
    expect(normalizeUrl(deeplinkUrl)).toBe(expectedUrl);
  });

  it('should handle empty string', () => {
    expect(normalizeUrl('')).toBe('https://');
  });
});

describe('getViewAccountUrl', () => {
  it('should collapse the EVM chain address into the evm parameter', () => {
    expect(getViewAccountUrl({
      bnb: TEST_EVM_ADDRESS,
      ton: TEST_TON_ADDRESS,
    })).toBe(`https://wallet.ice.io/view/?evm=${TEST_EVM_ADDRESS}&ton=${TEST_TON_ADDRESS}`);
  });

  it('should name a non-EVM chain by its own parameter', () => {
    expect(getViewAccountUrl({
      ton: TEST_TON_ADDRESS,
    })).toBe(`https://wallet.ice.io/view/?ton=${TEST_TON_ADDRESS}`);
  });

  it('should keep testnet parameter after the collapsed EVM parameter', () => {
    expect(getViewAccountUrl({
      bnb: TEST_EVM_ADDRESS,
    }, true)).toBe(`https://wallet.ice.io/view/?evm=${TEST_EVM_ADDRESS}&testnet=true`);
  });
});

describe('ION external links', () => {
  const base = 'https://explorer.ice.io/';
  it.each(['ion', 'tonscan', 'tonviewer', 'unknown'])('resolves explorer ID %s without migrating settings', (id) => {
    expect(getExplorerName('ton', id)).toBe('ION Explorer');
    expect(getExplorerAddressUrl('ton', TEST_TON_ADDRESS, false, id)).toBe(base + 'address/' + TEST_TON_ADDRESS);
  });
  it('uses all five public routes', () => {
    expect(getExplorerTokenUrl('ton', undefined, TEST_TON_ADDRESS)).toBe(base + 'jetton/' + TEST_TON_ADDRESS);
    expect(getExplorerNftUrl('ton', TEST_NFT_ADDRESS)).toBe(base + 'nft/' + TEST_NFT_ADDRESS);
    expect(getExplorerNftCollectionUrl('ton', TEST_NFT_COLLECTION_ADDRESS))
      .toBe(base + 'collection/' + TEST_NFT_COLLECTION_ADDRESS);
    expect(getExplorerTransactionUrl('ton', TEST_TON_HASH)).toBe(base + 'transaction/' + TEST_TON_HASH);
    expect(getExplorerTransactionUrl('ton', Buffer.from(TEST_TON_HASH, 'hex').toString('base64')))
      .toBe(base + 'transaction/' + TEST_TON_HASH);
  });
  it('does not send testnet objects to mainnet or offer an ION marketplace', () => {
    expect(getExplorerAddressUrl('ton', TEST_TON_ADDRESS, true)).toBeUndefined();
    expect(getExplorerTokenUrl('ton', undefined, TEST_TON_ADDRESS, true)).toBeUndefined();
    expect(getExplorerTransactionUrl('ton', TEST_TON_HASH, true)).toBeUndefined();
    expect(getExplorerNftUrl('ton', TEST_NFT_ADDRESS, true)).toBeUndefined();
    expect(getExplorerNftCollectionUrl('ton', TEST_NFT_COLLECTION_ADDRESS, true)).toBeUndefined();
    for (const testnet of [true, false]) {
      expect(getMarketplaceNftUrl('ton', TEST_NFT_ADDRESS, testnet)).toBeUndefined();
      expect(getMarketplaceNftCollectionUrl('ton', TEST_NFT_COLLECTION_ADDRESS, testnet)).toBeUndefined();
    }
    expect(getExplorerTokenUrl('ton', 'toncoin')).toBeUndefined();
    expect(getExplorerTokenUrl('ton', 'unconfirmed-ion-page')).toBeUndefined();
  });
  it('forwards the selected explorer ID to the base URL and template', () => {
    const explorers = getChainConfig('ton').explorers;
    explorers.push({ ...explorers[0], id: 'fixture', name: 'Fixture', baseUrl: { mainnet: 'https://example.org/' } });
    try {
      expect(getExplorerAddressUrl('ton', 'address', false, 'fixture')).toBe('https://example.org/address/address');
      expect(getExplorerTokenUrl('ton', undefined, 'address', false, 'fixture'))
        .toBe('https://example.org/jetton/address');
    } finally { explorers.pop(); }
  });
  it('keeps BNB links and hides its unsupported marketplace testnet', () => {
    expect(getExplorerAddressUrl('bnb', TEST_EVM_ADDRESS)).toBe('https://bscscan.com/address/' + TEST_EVM_ADDRESS);
    expect(getExplorerTransactionUrl('bnb', '0x123', true)).toBe('https://testnet.bscscan.com/tx/0x123');
    expect(getMarketplaceNftUrl('bnb', TEST_EVM_ADDRESS)).toBe('https://opensea.io/item/bnb/' + TEST_EVM_ADDRESS);
    expect(getMarketplaceNftUrl('bnb', TEST_EVM_ADDRESS, true)).toBeUndefined();
    expect(getMarketplaceNftCollectionUrl('bnb', TEST_EVM_ADDRESS)).toBeUndefined();
    expect(convertExplorerUrl('https://bscscan.com/address/' + TEST_EVM_ADDRESS, 'bsctrace'))
      .toBe('https://bscscan.com/address/' + TEST_EVM_ADDRESS);
  });
  it('does not reinterpret legacy TON URLs as ION addresses', () => {
    expect(convertExplorerUrl('https://tonscan.org/address/' + TEST_TON_ADDRESS, 'ion')).toBeUndefined();
  });
});

describe('isInIframeWhitelist', () => {
  it('keeps explorers outside the embedded bridge whitelist', () => {
    expect(isInIframeWhitelist('https://tonscan.org')).toBe(false);
    expect(isInIframeWhitelist('https://explorer.ice.io/address/test')).toBe(false);
    expect(isInIframeWhitelist('https://tonscan.org/address/EQ123')).toBe(false);
    expect(isInIframeWhitelist('https://testnet.tonviewer.com/')).toBe(false);
  });

  it('accepts localhost on any port', () => {
    expect(isInIframeWhitelist('http://localhost:4321/index.html')).toBe(true);
  });

  // A whitelisted page gets the embedded dapp bridge (TonConnect connect/send), so a host that merely starts with
  // an allowed origin must not pass: `tonscan.org.evil.tld` is a domain the attacker owns.
  it('rejects a host that only starts with a whitelisted origin', () => {
    expect(isInIframeWhitelist('https://tonscan.org.evil.tld/steal')).toBe(false);
    expect(isInIframeWhitelist('https://tonviewer.com.evil.tld')).toBe(false);
    expect(isInIframeWhitelist('https://tonscan.org.evil.tld/tonscan.org')).toBe(false);
  });

  it('rejects a whitelisted host reached over a different scheme or as a subdomain', () => {
    expect(isInIframeWhitelist('http://tonscan.org')).toBe(false);
    expect(isInIframeWhitelist('https://evil.tonscan.org')).toBe(false);
    expect(isInIframeWhitelist('https://localhost.evil.tld')).toBe(false);
  });

  it('rejects a whitelisted origin smuggled into credentials or a path', () => {
    expect(isInIframeWhitelist('https://tonscan.org@evil.tld/')).toBe(false);
    expect(isInIframeWhitelist('https://evil.tld/https://tonscan.org')).toBe(false);
  });

  it('returns false on a malformed url instead of throwing', () => {
    expect(isInIframeWhitelist('not a url')).toBe(false);
    expect(isInIframeWhitelist('https://')).toBe(false);
    expect(isInIframeWhitelist('')).toBe(false);
  });

  // The bare origin carries an implicit default port, so the explicit form has to resolve to the same
  // whitelisted page, and localhost stays http-only because that is the single entry the list grants.
  it('normalizes the default port and keeps localhost http-only', () => {
    expect(isInIframeWhitelist('https://tonscan.org:443/address/EQ123')).toBe(false);
    expect(isInIframeWhitelist('https://localhost:4321')).toBe(false);
  });
});
