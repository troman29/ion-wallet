import { ACTIVE_TAB_STORAGE_KEY, LEGACY_ACTIVE_TAB_STORAGE_KEY } from '../config';

jest.mock('./windowEnvironment', () => ({ IS_ELECTRON: false }));

describe('active tab compatibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each([ACTIVE_TAB_STORAGE_KEY, LEGACY_ACTIVE_TAB_STORAGE_KEY])(
    'deactivates when another tab updates %s', (key) => {
      const onInactive = jest.fn();
      jest.isolateModules(() => {
        const { setActiveTabChangeListener } = jest.requireActual<typeof import('./activeTabMonitor')>(
          './activeTabMonitor',
        );
        setActiveTabChangeListener(onInactive);
      });
      expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBeTruthy();
      expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY))
        .toBe(localStorage.getItem(LEGACY_ACTIVE_TAB_STORAGE_KEY));
      jest.advanceTimersByTime(2000);
      expect(onInactive).not.toHaveBeenCalled();
      localStorage.setItem(key, 'another-tab');
      jest.advanceTimersByTime(4000);
      expect(onInactive).toHaveBeenCalledTimes(1);
    },
  );
});
