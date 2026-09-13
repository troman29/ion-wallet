import { VirtualType } from '../lib/teact/teact';

import type { ApiChain } from '../api/types';
import type { Account } from '../global/types';

import { getOrderedAccountChains } from './chain';
import { formatAccountAddresses } from './formatAccountAddress';

const BNB_ADDRESS = '0x9429C8Af1089efD542b313156Af2DFA35c7e0a81';

function formatAllAccountAddresses(byChain: Account['byChain'], variant?: 'x-small' | 'small' | 'medium') {
  return formatAccountAddresses(byChain, getOrderedAccountChains(byChain), variant);
}

const singleChainTonAccount: Account['byChain'] = {
  ton: {
    address: 'UQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
  },
};
const singleChainTonDomainAccount: Account['byChain'] = {
  ton: {
    address: 'UQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
    domain: 'mywalletverylong.ton',
  },
};
const singleChainBnbAccount: Account['byChain'] = {
  bnb: {
    address: BNB_ADDRESS,
  },
};
const multiChainAccount: Account['byChain'] = {
  ton: {
    address: 'UQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
  },
  bnb: {
    address: BNB_ADDRESS,
  },
};
const multiChainDomainAccount: Account['byChain'] = {
  ton: {
    address: 'UQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
    domain: 'wallet.ton',
  },
  bnb: {
    address: BNB_ADDRESS,
  },
};
// `formatAccountAddresses` renders whatever chain list it is handed and never looks a chain up in
// `CHAIN_CONFIG`, so the truncation cases below can hold more chains than the app supports. An app of
// two chains has nothing to truncate, and the rule would go untested.
const foreignChain = (name: string) => name as ApiChain;
const FOUR_CHAINS = [foreignChain('alpha'), foreignChain('beta'), 'ton', 'bnb'] as ApiChain[];

const fourChainAccount: Account['byChain'] = {
  ton: {
    address: 'UQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
  },
  bnb: {
    address: BNB_ADDRESS,
  },
  [foreignChain('alpha')]: {
    address: '0xAlphaAddrXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  },
  [foreignChain('beta')]: {
    address: 'BetaAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
};
const shortSingleChainTonAccount: Account['byChain'] = {
  ton: {
    address: 'SHORT',
  },
};
const shortSingleChainTonDomainAccount: Account['byChain'] = {
  ton: {
    address: 'UQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
    domain: 'ab.ton',
  },
};

describe('formatAccountAddresses', () => {
  describe('empty or invalid input', () => {
    test('empty byChain object', () => {
      const byChain: Account['byChain'] = {};
      const result = formatAllAccountAddresses(byChain);

      expect(result).toBeUndefined();
    });
  });

  describe('explicit chain list', () => {
    test('renders the given chains only, in the given order', () => {
      const result = formatAccountAddresses(fourChainAccount, [foreignChain('beta'), 'ton']);

      const icons = findElementsByTag(result, 'i');
      expect(icons.map((icon) => icon.props.className)).toEqual(['icon-chain-beta', 'icon-chain-ton']);
    });
  });

  describe('medium variant (default)', () => {
    describe('single-chain account', () => {
      test('TON chain with address', () => {
        const result = formatAllAccountAddresses(singleChainTonAccount);

        // Check icon class
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(1);
        expect(icons[0].props.className).toBe('icon-chain-ton');

        // Check address format (6 chars left, 6 chars right)
        const text = getTextContent(result);
        expect(text).toEqual('UQA1B2···T0U1V2');
      });

      test('TON chain with domain', () => {
        const result = formatAllAccountAddresses(singleChainTonDomainAccount);

        // Check icon class
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(1);
        expect(icons[0].props.className).toBe('icon-chain-ton');

        // Check domain format (maxLength=12)
        const text = getTextContent(result);
        expect(text).toBe('mywal···.ton');
        expect(text).not.toContain('UQA');
      });

      test('BNB chain with address', () => {
        const result = formatAllAccountAddresses(singleChainBnbAccount);

        // Check icon class
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(1);
        expect(icons[0].props.className).toBe('icon-chain-bnb');

        // Check address format (6 chars left, 6 chars right)
        const text = getTextContent(result);
        expect(text).toEqual('0x9429···7e0a81');
      });
    });

    describe('multi-chain account', () => {
      test('TON and BNB with addresses only', () => {
        const result = formatAllAccountAddresses(multiChainAccount);

        // Check both icons
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(2);
        expect(icons[0].props.className).toBe('icon-chain-ton');
        expect(icons[1].props.className).toBe('icon-chain-bnb');

        // Check address format for multichain (0 chars left, 6 chars right for addresses)
        const text = getTextContent(result);
        expect(text).toContain('···T0U1V2');
        expect(text).toContain('···7e0a81');

        // Check comma separator for medium variant
        expect(text).toContain(', ');
      });

      test('mixed: one with domain, one with address', () => {
        const result = formatAllAccountAddresses(multiChainDomainAccount);

        // Check domain format for TON (maxLength=12)
        const text = getTextContent(result);
        expect(text).toContain('wallet.ton');

        // Check address format for BNB (0 chars left, 6 chars right)
        expect(text).toContain('···7e0a81');

        // Check comma separator
        expect(text).toContain(', ');
      });
    });

    describe('short addresses/domains', () => {
      test('short address that should not be truncated', () => {
        const result = formatAllAccountAddresses(shortSingleChainTonAccount);

        // Short address should be displayed as is (no truncation)
        const text = getTextContent(result);
        expect(text).toContain('SHORT');
        expect(text).not.toContain('···');
      });

      test('short domain in single-chain', () => {
        const result = formatAllAccountAddresses(shortSingleChainTonDomainAccount);

        // Short domain should be displayed as is
        const text = getTextContent(result);
        expect(text).toContain('ab.ton');
        expect(text).not.toContain('···');
      });
    });
  });

  describe('x-small variant', () => {
    describe('single-chain account', () => {
      test('TON chain with address', () => {
        const result = formatAllAccountAddresses(singleChainTonAccount, 'x-small');

        // Check icon class
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(1);
        expect(icons[0].props.className).toBe('icon-chain-ton');

        // Check address format (0 chars left, 4 chars right)
        const text = getTextContent(result);
        expect(text).toEqual('···U1V2');
      });

      test('TON chain with domain', () => {
        const result = formatAllAccountAddresses(singleChainTonDomainAccount, 'x-small');

        // Check icon class
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(1);
        expect(icons[0].props.className).toBe('icon-chain-ton');

        // Check domain format (maxLength=6)
        const text = getTextContent(result);
        expect(text).toBe('m···.ton');
        expect(text).not.toContain('UQA');
      });

      test('BNB chain with address', () => {
        const result = formatAllAccountAddresses(singleChainBnbAccount, 'x-small');

        // Check icon class
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(1);
        expect(icons[0].props.className).toBe('icon-chain-bnb');

        // Check address format (0 chars left, 4 chars right)
        const text = getTextContent(result);
        expect(text).toEqual('···0a81');
      });
    });

    describe('multi-chain account', () => {
      test('TON and BNB with addresses only', () => {
        const result = formatAllAccountAddresses(multiChainAccount, 'x-small');

        // Check both icons are present
        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(2);
        expect(icons[0].props.className).toBe('icon-chain-ton');
        expect(icons[1].props.className).toBe('icon-chain-bnb');

        const text = getTextContent(result);

        // Only the first chain (TON) shows address text; TRON is icon-only
        expect(text).toContain('···U1V2');
        expect(text).not.toContain('···Lj6t');

        // Check space separator for small variant
        expect(text).toMatch(/···U1V2\s+/);
      });

      test('mixed: one with domain, one with address', () => {
        const result = formatAllAccountAddresses(multiChainDomainAccount, 'x-small');

        // Only the first chain (TON) shows domain text; TRON is icon-only
        const text = getTextContent(result);
        expect(text).toContain('w···.ton');
        expect(text).not.toContain('0a81');
      });

      test('account with 4 chains shows only first 3', () => {
        const result = formatAccountAddresses(fourChainAccount, FOUR_CHAINS, 'x-small');

        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(3);
        expect(icons[0].props.className).toBe('icon-chain-alpha');
        expect(icons[1].props.className).toBe('icon-chain-beta');
        expect(icons[2].props.className).toBe('icon-chain-ton');
        expect(icons.some((icon) => icon.props.className === 'icon-chain-bnb')).toBe(false);
      });
    });

    describe('short addresses/domains', () => {
      test('short address that should not be truncated', () => {
        const result = formatAllAccountAddresses(shortSingleChainTonAccount, 'x-small');

        // Short address should be displayed as is (no truncation)
        const text = getTextContent(result);
        expect(text).toContain('SHORT');
        expect(text).not.toContain('···');
      });

      test('short domain in single-chain', () => {
        const result = formatAllAccountAddresses(shortSingleChainTonDomainAccount, 'x-small');

        // Short domain should be displayed as is
        const text = getTextContent(result);
        expect(text).toContain('ab.ton');
        expect(text).not.toContain('···');
      });
    });
  });

  describe('small variant', () => {
    describe('single-chain account', () => {
      test('TON chain with address uses small sizing', () => {
        const result = formatAllAccountAddresses(singleChainTonAccount, 'small');

        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(1);
        expect(icons[0].props.className).toBe('icon-chain-ton');

        // Small sizing: 0 chars left, 4 chars right
        const text = getTextContent(result);
        expect(text).toEqual('···U1V2');
      });

      test('TON chain with domain uses small sizing', () => {
        const result = formatAllAccountAddresses(singleChainTonDomainAccount, 'small');

        // Small domain sizing: maxLength=6
        const text = getTextContent(result);
        expect(text).toBe('m···.ton');
      });
    });

    describe('multi-chain account', () => {
      test('two chains both show address with comma separator', () => {
        const result = formatAllAccountAddresses(multiChainAccount, 'small');

        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(2);
        expect(icons[0].props.className).toBe('icon-chain-ton');
        expect(icons[1].props.className).toBe('icon-chain-bnb');

        // Both addresses use small sizing (0 left, 4 right)
        const text = getTextContent(result);
        expect(text).toContain('···U1V2');
        expect(text).toContain('···0a81');
        expect(text).toContain(', ');
      });

      test('four chains: first 3 icons, only first 2 with address', () => {
        const result = formatAccountAddresses(fourChainAccount, FOUR_CHAINS, 'small');

        const icons = findElementsByTag(result, 'i');
        expect(icons).toHaveLength(3);
        expect(icons[0].props.className).toBe('icon-chain-alpha');
        expect(icons[1].props.className).toBe('icon-chain-beta');
        expect(icons[2].props.className).toBe('icon-chain-ton');

        // Only the first two chains render an address; the third is icon-only
        const text = getTextContent(result);
        expect(text).toContain('···XXXX');
        expect(text).toContain('···aaaa');
        expect(text.match(/···/g)).toHaveLength(2);
      });
    });
  });
});

/**
 * Helper function to extract text content from Teact elements
 */
function getTextContent(element: TeactJsx): string {
  if (typeof element === 'string') {
    return element;
  }

  if (!element) {
    return '';
  }

  if (element.type === VirtualType.Text) {
    return element.value || '';
  }

  // Handle children
  if (element.children) {
    if (Array.isArray(element.children)) {
      return element.children.map(getTextContent).join('');
    }
    return getTextContent(element.children);
  }

  return '';
}

/**
 * Helper function to find all elements with specific tag name
 */
function findElementsByTag(element: any, tagName: string): any[] {
  const results: any[] = [];

  if (!element) {
    return results;
  }

  if (element.type === VirtualType.Tag && element.tag === tagName) {
    results.push(element);
  }

  // Recursively search in children
  if (element.children) {
    const children = Array.isArray(element.children)
      ? element.children
      : [element.children];

    children.forEach((child: any) => {
      results.push(...findElementsByTag(child, tagName));
    });
  }

  return results;
}
