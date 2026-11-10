import '../util/bigintPatch';

import { Address } from '@ton/core';

import { GLOBAL_STATE_CACHE_KEY, IONCOIN, LIQUID_JETTON, STAKED_ION_SLUG } from '../config';
import { loadCache, saveGlobalCacheNow } from './cache';
import { INITIAL_STATE, STATE_VERSION } from './initialState';

describe('token details cache', () => {
  afterEach(() => localStorage.removeItem(GLOBAL_STATE_CACHE_KEY));

  it('adds an empty details cache when opening an existing installation', () => {
    localStorage.setItem(GLOBAL_STATE_CACHE_KEY, JSON.stringify({
      stateVersion: STATE_VERSION, settings: INITIAL_STATE.settings, byAccountId: {},
    }));
    expect(loadCache(INITIAL_STATE).tokenDetails).toEqual({ bySlug: {} });
  });

  it('persists selected token details, including language, and trims unused tokens', () => {
    const ionDetails = { data: { description: 'ION description' }, langCode: 'en' as const, fetchedAt: 123 };
    saveGlobalCacheNow({
      ...INITIAL_STATE,
      accounts: { byId: {} },
      tokenDetails: { bySlug: { ioncoin: ionDetails, unused: ionDetails } },
    });
    expect(loadCache(INITIAL_STATE).tokenDetails.bySlug).toEqual({ ioncoin: ionDetails });
  });
});

describe('tiny transfer visibility', () => {
  afterEach(() => {
    localStorage.removeItem(GLOBAL_STATE_CACHE_KEY);
  });

  it('shows tiny transfers in a new wallet', () => {
    expect(loadCache(INITIAL_STATE).settings.areTinyTransfersHidden).toBe(false);
  });

  it('shows tiny transfers after migrating version 1 settings', () => {
    localStorage.setItem(GLOBAL_STATE_CACHE_KEY, JSON.stringify({
      stateVersion: 1,
      settings: { ...INITIAL_STATE.settings, areTinyTransfersHidden: true },
      byAccountId: {},
    }));

    const global = loadCache(INITIAL_STATE);

    expect(global.stateVersion).toBe(STATE_VERSION);
    expect(global.settings.areTinyTransfersHidden).toBe(false);
  });

  it('preserves the choice to hide tiny transfers after migration', () => {
    localStorage.setItem(GLOBAL_STATE_CACHE_KEY, JSON.stringify({
      stateVersion: STATE_VERSION,
      settings: { ...INITIAL_STATE.settings, areTinyTransfersHidden: true },
      byAccountId: {},
    }));

    expect(loadCache(INITIAL_STATE).settings.areTinyTransfersHidden).toBe(true);
  });
});

describe('ION token slug migration', () => {
  const oldLionSlug = `ton-${LIQUID_JETTON}`;
  const oldJettonSlug = 'ton-EQimported-token';
  const jettonSlug = 'ion-EQimported-token';

  afterEach(() => localStorage.removeItem(GLOBAL_STATE_CACHE_KEY));

  it.each([1, 2, 3, 4])('migrates version %s across accounts and clears transaction history', (stateVersion) => {
    const nativeSlug = 'toncoin';
    const tokenLists = [
      'pinnedSlugs', 'alwaysShownSlugs', 'alwaysHiddenSlugs', 'deletedSlugs', 'importedSlugs',
    ];
    const account = {
      currentTokenSlug: oldLionSlug,
      invoiceTokenSlug: oldJettonSlug,
      balances: { bySlug: { [nativeSlug]: 'bigint:10', [oldLionSlug]: 'bigint:20', bnb: 'bigint:30' } },
      staking: { stakingId: 'liquid', stateById: { liquid: { tokenSlug: nativeSlug, balance: 'bigint:40' } } },
      savedAddresses: [{ address: 'ton-keep-this-address', name: 'toncoin' }],
      currentActivityId: 'old-tx',
      activitiesUpdateStartedAt: 123,
      activities: {
        byId: { 'old-tx': { slug: 'toncoin' } },
        idsMain: ['old-tx'],
        idsBySlug: { toncoin: ['old-tx'] },
        newestActivitiesBySlug: { toncoin: { id: 'old-tx' } },
        pendingActivityIds: { ton: ['old-tx'] },
        mainHistoryHasMoreByChain: { ton: false },
        isHistoryEndReachedBySlug: { toncoin: true },
      },
    };
    const cache = {
      stateVersion,
      settings: {
        ...INITIAL_STATE.settings,
        areTinyTransfersHidden: true,
        byAccountId: {
          first: {
            ...Object.fromEntries(tokenLists.map((key) => [
              key, ['toncoin', 'ioncoin', oldLionSlug, oldJettonSlug, 'bnb'],
            ])),
            chainDisplayConfiguration: { displayMode: 'manual', manualOrder: ['ton', 'bnb'] },
          },
        },
      },
      byAccountId: { first: account, second: account },
      tokenInfo: { bySlug: { [nativeSlug]: { ...IONCOIN, slug: nativeSlug }, [oldLionSlug]: { slug: oldLionSlug } } },
      tokenPriceHistory: { bySlug: { [nativeSlug]: { '1D': [[1, 2]] } } },
      stakingDefault: { tokenSlug: nativeSlug },
      currentTransfer: { tokenSlug: oldLionSlug },
    };
    localStorage.setItem(GLOBAL_STATE_CACHE_KEY, JSON.stringify(cache));

    const global = loadCache(INITIAL_STATE);

    expect(global.stateVersion).toBe(STATE_VERSION);
    expect(global.settings.areTinyTransfersHidden).toBe(stateVersion !== 1);
    expect(Object.keys(global.tokenInfo.bySlug)).toEqual(['ioncoin', STAKED_ION_SLUG]);
    expect(global.tokenInfo.bySlug.ioncoin.slug).toBe('ioncoin');
    expect(global.tokenInfo.bySlug[STAKED_ION_SLUG].slug).toBe(STAKED_ION_SLUG);
    expect(global.tokenPriceHistory.bySlug.ioncoin['1D']).toEqual([[1, 2]]);
    expect(global.stakingDefault.tokenSlug).toBe('ioncoin');
    expect(global.currentTransfer.tokenSlug).toBe(STAKED_ION_SLUG);
    for (const state of Object.values(global.byAccountId)) {
      expect(state.balances?.bySlug).toEqual({ ioncoin: 10n, [STAKED_ION_SLUG]: 20n, bnb: 30n });
      expect(state.currentTokenSlug).toBe(STAKED_ION_SLUG);
      expect(state.invoiceTokenSlug).toBe(jettonSlug);
      expect(state.staking).toEqual({
        stakingId: 'liquid', stateById: { liquid: { tokenSlug: 'ioncoin', balance: 40n } },
      });
      expect(state.activities).toBeUndefined();
      expect(state.currentActivityId).toBeUndefined();
      expect(state.activitiesUpdateStartedAt).toBeUndefined();
      expect(state.savedAddresses).toEqual(account.savedAddresses);
    }
    const settings = global.settings.byAccountId.first;
    tokenLists.forEach((key) => {
      expect(settings[key as keyof typeof settings]).toEqual(['ioncoin', STAKED_ION_SLUG, jettonSlug, 'bnb']);
    });
    expect(settings.chainDisplayConfiguration?.manualOrder).toEqual(['ton', 'bnb']);
  });

  it('does not clear newly fetched history when loading the current schema', () => {
    localStorage.setItem(GLOBAL_STATE_CACHE_KEY, JSON.stringify({
      stateVersion: STATE_VERSION,
      byAccountId: { first: { activities: { byId: {}, idsMain: ['new-tx'] }, currentActivityId: 'new-tx' } },
    }));
    const global = loadCache(INITIAL_STATE);
    expect(global.byAccountId.first.activities?.idsMain).toEqual(['new-tx']);
    expect(global.byAccountId.first.currentActivityId).toBe('new-tx');
  });

  it('migrates address aliases in metadata, balances, selected tokens and visibility settings', () => {
    const aliasAddress = Address.parse(LIQUID_JETTON).toString({ bounceable: false });
    const aliasSlug = `ton-${aliasAddress}`;
    localStorage.setItem(GLOBAL_STATE_CACHE_KEY, JSON.stringify({
      stateVersion: 2,
      tokenInfo: { bySlug: {
        [aliasSlug]: { chain: 'ton', slug: aliasSlug, tokenAddress: aliasAddress, priceUsd: 2 },
      } },
      settings: { byAccountId: { first: { pinnedSlugs: [aliasSlug, STAKED_ION_SLUG] } } },
      byAccountId: { first: {
        balances: { bySlug: { [aliasSlug]: 'bigint:7', [STAKED_ION_SLUG]: 'bigint:0' } },
        currentTokenSlug: aliasSlug,
        activities: { byId: {}, idsMain: ['cached-tx'] },
      } },
    }));
    const global = loadCache(INITIAL_STATE);
    expect(global.stateVersion).toBe(STATE_VERSION);
    expect(global.tokenInfo.bySlug[STAKED_ION_SLUG]).toMatchObject({
      slug: STAKED_ION_SLUG, tokenAddress: LIQUID_JETTON, priceUsd: 2,
    });
    expect(global.byAccountId.first.balances?.bySlug).toEqual({ [STAKED_ION_SLUG]: 0n });
    expect(global.byAccountId.first.currentTokenSlug).toBe(STAKED_ION_SLUG);
    expect(global.byAccountId.first.activities).toBeUndefined();
    expect(global.settings.byAccountId.first.pinnedSlugs).toEqual([STAKED_ION_SLUG]);
  });
});
describe('activity history migration', () => {
  afterEach(() => {
    localStorage.removeItem(GLOBAL_STATE_CACHE_KEY);
  });

  // Version 2 activities miss their NFT, version 3 ones may be missing from the main feed
  it.each([2, 3])('drops the cached activities of version %i and keeps the rest of the account', (stateVersion) => {
    localStorage.setItem(GLOBAL_STATE_CACHE_KEY, JSON.stringify({
      stateVersion,
      settings: INITIAL_STATE.settings,
      byAccountId: {
        '0-mainnet': {
          activities: { byId: { tx: { id: 'tx' } }, idsMain: ['tx'] },
          nfts: { byAddress: { nft: { address: 'nft' } } },
        },
      },
    }));

    const global = loadCache(INITIAL_STATE);

    expect(global.byAccountId['0-mainnet']?.activities).toBeUndefined();
    expect(global.byAccountId['0-mainnet']?.nfts?.byAddress).toHaveProperty('nft');
  });
});
