import type { AddressBook } from './types';

jest.mock('../../../common/backend', () => ({ callBackendPost: jest.fn() }));

const ALICE_RAW = '0:5B83A1DD92E5948F3B8E2F2B3CB0245B0881C0E2FDF4450C57E42A358F8471AC';
const ALICE = 'UQBbg6HdkuWUjzuOLys8sCRbCIHA4v30RQxX5Co1j4RxrNgy';
const BOB_RAW = '0:0101010101010101010101010101010101010101010101010101010101010101';
const BOB = 'UQABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAZAm';
const CONTRACT_RAW = '0:026F0237F119EF7255395AFE87F730EBF00A3FB6AF4D5A2957C419A813CCABA1';
const CONTRACT = 'EQACbwI38RnvclU5Wv6H9zDr8Ao_tq9NWilXxBmoE8yroZlF';

function buildAddressBook(): AddressBook {
  /* eslint-disable no-null/no-null */
  return {
    [ALICE_RAW]: { user_friendly: ALICE, domain: null },
    [BOB_RAW]: { user_friendly: BOB, domain: 'bob.ion' },
    [CONTRACT_RAW]: { user_friendly: CONTRACT, domain: null },
  };
  /* eslint-enable no-null/no-null */
}

describe('fillAddressBookNames', () => {
  let fill: typeof import('./dnsNames').fillAddressBookNames;
  let callBackendPostMock: jest.MockedFunction<typeof import('../../../common/backend').callBackendPost>;

  // The name cache lives in the module, so every test gets a fresh one
  beforeEach(() => {
    jest.resetModules();
    fill = jest.requireActual<typeof import('./dnsNames')>('./dnsNames').fillAddressBookNames;
    callBackendPostMock = jest.mocked(
      jest.requireMock<typeof import('../../../common/backend')>('../../../common/backend').callBackendPost,
    );
  });

  it('fills missing wallet names and keeps the existing ones', async () => {
    callBackendPostMock.mockResolvedValue({ [ALICE]: 'alice.ion' });
    const addressBook = buildAddressBook();

    await fill('mainnet', addressBook);

    expect(callBackendPostMock).toHaveBeenCalledWith('/dns/names', { addresses: [ALICE] }, expect.anything());
    expect(addressBook[ALICE_RAW].domain).toBe('alice.ion');
    expect(addressBook[BOB_RAW].domain).toBe('bob.ion');
    expect(addressBook[CONTRACT_RAW].domain).toBeNull();
  });

  it('survives a backend failure', async () => {
    callBackendPostMock.mockRejectedValue(new Error('down'));
    const addressBook = buildAddressBook();

    await expect(fill('mainnet', addressBook)).resolves.toBeUndefined();
    expect(addressBook[ALICE_RAW].domain).toBeNull();
  });

  it('asks the backend once for concurrent and repeated lookups, remembering misses too', async () => {
    callBackendPostMock.mockResolvedValue({});

    await Promise.all([fill('mainnet', buildAddressBook()), fill('mainnet', buildAddressBook())]);
    await fill('mainnet', buildAddressBook());

    expect(callBackendPostMock).toHaveBeenCalledTimes(1);
  });

  it('does not ask the backend on the testnet', async () => {
    await fill('testnet', buildAddressBook());

    expect(callBackendPostMock).not.toHaveBeenCalled();
  });
});
