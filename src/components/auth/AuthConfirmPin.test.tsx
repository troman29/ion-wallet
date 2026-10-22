import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { getGlobal, setGlobal } from '../../global';

import { INITIAL_STATE } from '../../global/initialState';
import { cloneDeep } from '../../util/iteratees';
import { pause } from '../../util/schedulers';

import AuthConfirmPin from './AuthConfirmPin';

jest.mock('../ui/AnimatedIconWithPreview', () => ({ __esModule: true, default: () => undefined }));

const mockConfirmPin = jest.fn();
jest.mock('../../global', () => ({
  ...jest.requireActual('../../global'),
  getActions: () => ({ ...jest.requireActual('../../global').getActions(), confirmPin: mockConfirmPin }),
}));

let root: HTMLDivElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  mockConfirmPin.mockClear();
  const global = cloneDeep(INITIAL_STATE);
  global.auth.pin = '1234';
  setGlobal(global);
});
afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

async function enterPin() {
  for (const digit of '1234') {
    const button = Array.from(root.querySelectorAll('[role="button"]')).find((el) => el.textContent?.trim() === digit);
    expect(button).toBeDefined();
    button!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await pause(50);
  }
  await pause(1600);
}

it('shows a protection error instead of staying successful and accepts a retry', async () => {
  TeactDOM.render(<AuthConfirmPin isActive method="importMnemonic" />, root);
  await pause(100);
  await enterPin();
  expect(mockConfirmPin).toHaveBeenCalledTimes(1);
  expect(root.textContent).toContain('Code set successfully');
  const global = getGlobal();
  setGlobal({ ...global, auth: { ...global.auth, pin: '1234', error: 'Wrong password, please try again.' } });
  await pause(100);
  expect(root.textContent).toContain('Wrong password, please try again.');
  expect(root.textContent).not.toContain('Code set successfully');
  await enterPin();
  expect(mockConfirmPin).toHaveBeenCalledTimes(2);
});
