import type { ApiNetwork } from '../src/api/types';

import { DEFAULT_WALLET_VERSION } from '../src/config';

jest.mock('../src/api/chains/ton/wallet', () => {
  const actual = jest.requireActual('../src/api/chains/ton/wallet');
  const { ApiServerError: ApiServerErrorActual } = jest.requireActual('../src/api/errors');

  return {
    ...actual,
    pickBestWallet: jest.fn(() => {
      throw new ApiServerErrorActual('offline');
    }),
    pickBestWalletVersion: jest.fn(() => {
      throw new ApiServerErrorActual('offline');
    }),
  };
});

jest.mock('tonweb-mnemonic', () => ({
  mnemonicToKeyPair: jest.fn(() => ({
    publicKey: new Uint8Array(32).fill(7),
    secretKey: new Uint8Array(64).fill(9),
  })),
  validateMnemonic: jest.fn(() => true),
  generateMnemonic: jest.fn(() => ([])),
}));

jest.mock('../src/api/chains/evm/wallet', () => {
  const actual = jest.requireActual('../src/api/chains/evm/wallet');
  const { ApiServerError: ApiServerErrorActual } = jest.requireActual('../src/api/errors');

  return {
    ...actual,
    getWalletBalance: jest.fn(() => {
      throw new ApiServerErrorActual('offline');
    }),
    getWalletLastTransaction: jest.fn(() => {
      throw new ApiServerErrorActual('offline');
    }),
  };
});

import { getWalletFromBip39Mnemonic as getEvmWalletFromBip39Mnemonic } from '../src/api/chains/evm/auth';
import { getWalletBalance as getEvmWalletBalance } from '../src/api/chains/evm/wallet';
import { getWalletFromBip39Mnemonic, getWalletFromMnemonic, getWalletFromPrivateKey } from '../src/api/chains/ton/auth';

describe('Offline wallet import fallbacks', () => {
  const mnemonicBip39 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    .split(' ');

  test('TON: getWalletFromMnemonic falls back to default version when network calls fail', async () => {
    const wallet = await getWalletFromMnemonic('mainnet' as ApiNetwork, Array(24).fill('abandon'));
    expect(wallet.version).toBe(DEFAULT_WALLET_VERSION);
    expect(wallet.address).toBeTruthy();
    expect(wallet.publicKey).toBeTruthy();
  });

  test('TON: getWalletFromPrivateKey falls back to default version when network calls fail', async () => {
    const wallet = await getWalletFromPrivateKey('mainnet' as ApiNetwork, '00'.repeat(32));
    expect(wallet.version).toBe(DEFAULT_WALLET_VERSION);
    expect(wallet.address).toBeTruthy();
    expect(wallet.publicKey).toBeTruthy();
  });

  test('TON: getWalletFromBip39Mnemonic falls back when network calls fail', async () => {
    const wallets = await getWalletFromBip39Mnemonic('mainnet' as ApiNetwork, mnemonicBip39);
    expect(wallets.length).toBeGreaterThan(0);
    expect(wallets[0].version).toBe(DEFAULT_WALLET_VERSION);
    expect(wallets[0].derivation?.index).toBe(0);
  });

  test('EVM: getWalletFromBip39Mnemonic falls back to default derivation when RPC fails', async () => {
    const wallets = await getEvmWalletFromBip39Mnemonic('bnb', 'mainnet' as ApiNetwork, mnemonicBip39);
    expect(wallets.length).toBeGreaterThan(0);
    expect(wallets[0].address).toBeTruthy();
    expect(wallets[0].derivation?.index).toBe(0);
  });

  test('EVM: getWalletFromBip39Mnemonic falls back on non-ApiServerError RPC failures', async () => {
    (getEvmWalletBalance as jest.Mock).mockImplementationOnce(() => {
      throw new TypeError('Failed to fetch');
    });

    const wallets = await getEvmWalletFromBip39Mnemonic('bnb', 'mainnet' as ApiNetwork, mnemonicBip39);
    expect(wallets.length).toBeGreaterThan(0);
    expect(wallets[0].address).toBeTruthy();
    expect(wallets[0].derivation?.index).toBe(0);
  });

  test('EVM: an RPC request that never settles does not block import', async () => {
    const expected = await getEvmWalletFromBip39Mnemonic('bnb', 'mainnet', mnemonicBip39, undefined, true);
    const balanceMock = getEvmWalletBalance as jest.Mock;
    const original = balanceMock.getMockImplementation();
    jest.useFakeTimers();
    balanceMock.mockImplementation(() => new Promise(() => {}));
    try {
      const pending = getEvmWalletFromBip39Mnemonic('bnb', 'mainnet', mnemonicBip39);
      await jest.advanceTimersByTimeAsync(10000);
      await expect(pending).resolves.toEqual(expected);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      balanceMock.mockImplementation(original);
      jest.useRealTimers();
    }
  });

  test('EVM: programming errors are not treated as an unavailable RPC', async () => {
    (getEvmWalletBalance as jest.Mock).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(getEvmWalletFromBip39Mnemonic('bnb', 'mainnet', mnemonicBip39)).rejects.toThrow('boom');
  });

  test('TON: non-ApiServerError is not swallowed by offline fallback', async () => {
    const { pickBestWallet } = await import('../src/api/chains/ton/wallet');
    (pickBestWallet as unknown as jest.Mock).mockImplementationOnce(() => {
      throw new Error('boom');
    });

    await expect(getWalletFromMnemonic('mainnet' as ApiNetwork, Array(24).fill('abandon')))
      .rejects
      .toThrow('boom');
  });
});
