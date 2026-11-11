import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { getGlobal, setGlobal } from '../../global';

import { INITIAL_STATE } from '../../global/initialState';
import { cloneDeep } from '../../util/iteratees';
import { createSignal } from '../../util/signals';
import { waitForCondition } from '../../../tests/util/async';

import AppLocked from './AppLocked';

const [mockGetBackground, mockSetBackground] = createSignal(false);
jest.mock('../../config', () => ({ ...jest.requireActual('../../config'), IS_CAPACITOR: true }));
jest.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: jest.fn(() => Promise.resolve({ remove: jest.fn() })), hide: jest.fn() },
}));
jest.mock('../../util/capacitor/appLifecycle', () => ({
  get getIsAppInBackground() { return mockGetBackground; },
}));
jest.mock('../../util/haptics', () => ({ vibrate: jest.fn() }));
jest.mock('../ui/InAppBrowser', () => ({ getInAppBrowser: () => undefined }));
jest.mock('../ui/PasswordForm', () => ({ triggerPasswordFormHandleBiometrics: jest.fn() }));
jest.mock('./UnlockButtonSlide', () => ({ __esModule: true, default: () => <span>Locked</span> }));
jest.mock('./PasswordFormSlide', () => ({
  __esModule: true,
  default: ({ isActive, onSubmit }: { isActive: boolean; onSubmit: NoneToVoidFunction }) => (
    <button data-active={String(isActive)} onClick={onSubmit}>Unlock</button>
  ),
}));
jest.mock('../../global', () => ({
  ...jest.requireActual('../../global'),
  getActions: () => ({
    clearIsPinAccepted: jest.fn(), setIsManualLockActive: jest.fn(), setIsAppLockActive: jest.fn(),
  }),
}));

let root: HTMLDivElement;
beforeEach(() => {
  mockSetBackground(false);
  const global = cloneDeep(INITIAL_STATE);
  setGlobal({
    ...global, authTypes: ['passcode'],
    settings: { ...global.settings, animationLevel: 0, isAppLockEnabled: true, autolockValue: 'background' },
  });
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
  mockSetBackground(false);
  jest.restoreAllMocks();
});

it('checks an expired interval on return before recording new activity', async () => {
  const global = getGlobal();
  setGlobal({ ...global, settings: { ...global.settings, autolockValue: '1' } });
  TeactDOM.render(<AppLocked />, root);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="true"]')));
  root.querySelector('button')!.click();
  await waitForCondition(() => !root.querySelector('button'));
  mockSetBackground(true);
  jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
  mockSetBackground(false);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="true"]')));
});

it.each([true, false])('respects disabled auto-lock or app locking (%s)', async (isAppLockEnabled) => {
  const global = getGlobal();
  setGlobal({
    ...global,
    settings: { ...global.settings, isAppLockEnabled, autolockValue: isAppLockEnabled ? 'never' : 'background' },
  });
  TeactDOM.render(<AppLocked />, root);
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  mockSetBackground(true);
  mockSetBackground(false);
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  expect(root.querySelector('button')).toBeNull();
  if (isAppLockEnabled) {
    setGlobal({ ...getGlobal(), isManualLockActive: true });
    await waitForCondition(() => Boolean(root.querySelector('button')));
  }
});

it('locks on cold start, stays unlocked while active, and locks again across background and foreground', async () => {
  TeactDOM.render(<AppLocked />, root);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="true"]')), {
    failureMessage: `Cold start did not show an active form: ${root.innerHTML}`,
  });
  root.querySelector('button')!.click();
  await waitForCondition(() => !root.querySelector('button'), { failureMessage: 'Unlock did not hide the form' });
  window.dispatchEvent(new Event('blur'));
  window.dispatchEvent(new Event('focus'));
  expect(root.querySelector('button')).toBeNull();
  mockSetBackground(true);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="false"]')));
  mockSetBackground(false);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="true"]')));
});
