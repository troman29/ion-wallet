import { getAppBackgroundGeneration, getIsAppInBackground, initAppLifecycle } from './appLifecycle';

const mockListeners: Record<string, AnyToVoidFunction> = {};
jest.mock('@capacitor/app', () => ({
  App: { addListener: jest.fn((event: string, listener: AnyToVoidFunction) => {
    mockListeners[event] = listener;
    return Promise.resolve({ remove: jest.fn() });
  }) },
}));

afterEach(() => {
  mockListeners.appStateChange({ isActive: true });
  Object.keys(mockListeners).forEach((event) => delete mockListeners[event]);
});

it('ignores iOS system dialogs and counts only actual background transitions', async () => {
  await initAppLifecycle(true);
  const generation = getAppBackgroundGeneration();
  mockListeners.appStateChange({ isActive: false });
  expect(getIsAppInBackground()).toBe(false);
  expect(getAppBackgroundGeneration()).toBe(generation);
  mockListeners.pause();
  mockListeners.pause();
  expect(getIsAppInBackground()).toBe(true);
  expect(getAppBackgroundGeneration()).toBe(generation + 1);
  mockListeners.appStateChange({ isActive: true });
  expect(getIsAppInBackground()).toBe(false);
});

it('uses Android onStop rather than onPause and does not count repeated foreground events', async () => {
  await initAppLifecycle(false);
  expect(mockListeners.pause).toBeUndefined();
  const generation = getAppBackgroundGeneration();
  mockListeners.appStateChange({ isActive: true });
  expect(getAppBackgroundGeneration()).toBe(generation);
  mockListeners.appStateChange({ isActive: false });
  expect(getIsAppInBackground()).toBe(true);
  expect(getAppBackgroundGeneration()).toBe(generation + 1);
});
