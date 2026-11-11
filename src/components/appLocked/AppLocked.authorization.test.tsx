import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { setGlobal } from '../../global';

import { INITIAL_STATE } from '../../global/initialState';
import { cloneDeep } from '../../util/iteratees';
import { createSignal } from '../../util/signals';
import { waitForCondition } from '../../../tests/util/async';

import AppLocked from './AppLocked';

const [mockGetBackground, mockSetBackground] = createSignal(false);
let mockGeneration = 0;
const mockFinishVibrations: NoneToVoidFunction[] = [];
const mockClearPinAccepted = jest.fn();

jest.mock('../../config', () => ({ ...jest.requireActual('../../config'), IS_CAPACITOR: true }));
jest.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: jest.fn(() => Promise.resolve({ remove: jest.fn() })) },
}));
jest.mock('../../util/capacitor/appLifecycle', () => ({
  get getIsAppInBackground() { return mockGetBackground; },
  getAppBackgroundGeneration: () => mockGeneration,
}));
jest.mock('../../util/haptics', () => ({
  vibrate: jest.fn(),
  vibrateOnSuccess: () => new Promise<void>((resolve) => mockFinishVibrations.push(resolve)),
}));
jest.mock('../../util/biometrics', () => ({ getDoesUsePinPad: () => true }));
jest.mock('../ui/InAppBrowser', () => ({ getInAppBrowser: () => undefined }));
jest.mock('../ui/PasswordForm', () => ({
  __esModule: true,
  triggerPasswordFormHandleBiometrics: jest.fn(),
  default: ({ isActive, onAuthorize }: { isActive: boolean; onAuthorize: NoneToVoidFunction }) => (
    <button data-active={String(isActive)} onClick={onAuthorize}>Authorize</button>
  ),
}));
jest.mock('../../global', () => ({
  ...jest.requireActual('../../global'),
  getActions: () => ({
    clearIsPinAccepted: mockClearPinAccepted,
    setIsPinAccepted: jest.fn(),
    setIsManualLockActive: jest.fn(),
    setIsAppLockActive: jest.fn(),
  }),
}));

let root: HTMLDivElement;
beforeEach(() => {
  mockSetBackground(false);
  mockFinishVibrations.length = 0;
  mockClearPinAccepted.mockClear();
  const global = cloneDeep(INITIAL_STATE);
  setGlobal({
    ...global,
    authTypes: ['passcode'],
    settings: { ...global.settings, animationLevel: 0, isAppLockEnabled: true, autolockValue: 'background' },
  });
  root = document.createElement('div');
  document.body.append(root);
});
afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
  mockSetBackground(false);
});

it.each([true, false])('rejects an old success animation completed in foreground (%s)', async (finishInForeground) => {
  TeactDOM.render(<AppLocked />, root);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="true"]')));
  root.querySelector('button')!.click();
  await waitForCondition(() => mockFinishVibrations.length === 1);
  mockGeneration++;
  mockSetBackground(true);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="false"]')));

  if (finishInForeground) {
    mockSetBackground(false);
    await waitForCondition(() => Boolean(root.querySelector('button[data-active="true"]')));
  }
  mockFinishVibrations[0]();
  await new Promise((resolve) => {
    setTimeout(resolve, 400);
  });
  expect(root.querySelector('button')).not.toBeNull();
  expect(root.firstElementChild?.classList.contains('open')).toBe(true);
  expect(mockClearPinAccepted).toHaveBeenCalled();

  mockSetBackground(false);
  await waitForCondition(() => Boolean(root.querySelector('button[data-active="true"]')));
  root.querySelector('button')!.click();
  await waitForCondition(() => mockFinishVibrations.length === 2);
  mockFinishVibrations[1]();
  await waitForCondition(() => !root.querySelector('button'));
});
