import { GLOBAL_STATE_CACHE_KEY } from '../config';
import { loadCache } from './cache';
import { INITIAL_STATE, STATE_VERSION } from './initialState';

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
