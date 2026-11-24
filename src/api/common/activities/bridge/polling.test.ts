import { setIsAppFocused } from '../../../../util/focusAwareDelay';
import { getBackendConfigCacheSync } from '../../cache';
import { setupBridgeActivityPolling } from './polling';

jest.mock('../../cache', () => ({ getBackendConfigCacheSync: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  setIsAppFocused(true);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  setIsAppFocused(true);
});

it('stays quiet with capability disabled, then reconciles an idle account every focused interval', async () => {
  const onUpdate = jest.fn();
  const stop = setupBridgeActivityPolling('1-mainnet', onUpdate);
  await jest.advanceTimersByTimeAsync(0);
  expect(onUpdate).not.toHaveBeenCalled();
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({ isBridgeHistoryEnabled: true } as never);
  await jest.advanceTimersByTimeAsync(10_000);
  expect(onUpdate).toHaveBeenCalledWith({ type: 'newActivities', accountId: '1-mainnet', activities: [] });
  await jest.advanceTimersByTimeAsync(10_000);
  expect(onUpdate).toHaveBeenCalledTimes(2);
  stop();
  await jest.advanceTimersByTimeAsync(30_000);
  expect(onUpdate).toHaveBeenCalledTimes(2);
});

it('runs initially and uses the longer interval while the app is unfocused', async () => {
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({ isBridgeHistoryEnabled: true } as never);
  const onUpdate = jest.fn();
  const stop = setupBridgeActivityPolling('2-mainnet', onUpdate);
  await jest.advanceTimersByTimeAsync(0);
  expect(onUpdate).toHaveBeenCalledTimes(1);
  setIsAppFocused(false);
  await jest.advanceTimersByTimeAsync(10_000);
  expect(onUpdate).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(20_000);
  expect(onUpdate).toHaveBeenCalledTimes(2);
  stop();
});

it('does not emit a late initial callback after account polling was stopped', async () => {
  jest.mocked(getBackendConfigCacheSync).mockReturnValue({ isBridgeHistoryEnabled: true } as never);
  const onUpdate = jest.fn();
  setupBridgeActivityPolling('3-mainnet', onUpdate)();
  await jest.advanceTimersByTimeAsync(30_000);

  expect(onUpdate).not.toHaveBeenCalled();
});
