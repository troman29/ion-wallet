const mockTonCheckStakeDraft = jest.fn();
const mockTonCheckUnstakeDraft = jest.fn();
const mockSolanaCheckStakeDraft = jest.fn();

jest.mock('../chains', () => ({
  __esModule: true,
  default: {
    ton: { staking: {
      checkStakeDraft: (...args: unknown[]) => mockTonCheckStakeDraft(...args),
      checkUnstakeDraft: (...args: unknown[]) => mockTonCheckUnstakeDraft(...args),
    } },
    solana: { staking: { checkStakeDraft: (...args: unknown[]) => mockSolanaCheckStakeDraft(...args) } },
    tron: {},
  },
}));

import type { ApiStakingState } from '../types';

import { checkStakeDraft, checkUnstakeDraft } from './staking';

const ACCOUNT_ID = '0-mainnet';

function buildState(tokenSlug: string) {
  return { type: 'liquid', tokenSlug } as unknown as ApiStakingState;
}

describe('staking chain routing', () => {
  afterEach(() => {
    mockTonCheckStakeDraft.mockReset();
    mockTonCheckUnstakeDraft.mockReset();
    mockSolanaCheckStakeDraft.mockReset();
  });

  it('routes to the chain named by the staking state, not to the first staking chain in the registry', async () => {
    mockSolanaCheckStakeDraft.mockResolvedValue({ realFee: 1n });

    await checkStakeDraft(ACCOUNT_ID, 1n, buildState('solana-abc'));

    expect(mockSolanaCheckStakeDraft).toHaveBeenCalledTimes(1);
    expect(mockTonCheckStakeDraft).not.toHaveBeenCalled();
  });

  it('routes a native token slug to its chain', async () => {
    mockTonCheckStakeDraft.mockResolvedValue({ realFee: 1n });

    await checkStakeDraft(ACCOUNT_ID, 1n, buildState('ioncoin'));

    expect(mockTonCheckStakeDraft).toHaveBeenCalledTimes(1);
    expect(mockSolanaCheckStakeDraft).not.toHaveBeenCalled();
  });

  it('keeps LION redemption available through the dedicated unstake path', async () => {
    const state = buildState('ioncoin');
    mockTonCheckUnstakeDraft.mockResolvedValue({ realFee: 1n });
    await expect(checkUnstakeDraft(ACCOUNT_ID, 1n, state)).resolves.toEqual({ realFee: 1n });
    expect(mockTonCheckUnstakeDraft).toHaveBeenCalledWith(ACCOUNT_ID, 1n, state);
  });

  it('rejects when the state names a chain without staking', async () => {
    await expect(checkStakeDraft(ACCOUNT_ID, 1n, buildState('tron-xyz')))
      .rejects.toThrow('Staking is not supported for tron');
  });
});
