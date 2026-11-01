import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { setGlobal } from '../../global';

import { INITIAL_STATE } from '../../global/initialState';
import { cloneDeep } from '../../util/iteratees';
import { waitForCondition } from '../../../tests/util/async';
import { enclave } from '../../enclave';

import PasswordForm from './PasswordForm';

jest.mock('./AnimatedIconWithPreview', () => ({ __esModule: true, default: () => undefined }));
jest.mock('../main/modals/LogOutModal', () => ({ __esModule: true, default: () => undefined }));
jest.mock('../../hooks/useLang', () => ({
  __esModule: true,
  default: () => (key: string) => (key === 'Wrong password, please try again.'
    ? 'Неправильный пароль, попробуйте ещё раз.' : key),
}));
jest.mock('../../enclave', () => ({ enclave: { authorize: jest.fn() } }));
jest.mock('../../global', () => ({
  ...jest.requireActual('../../global'),
  getActions: () => ({
    setEnclaveSession: jest.fn(),
    upgradeMultichainAccounts: jest.fn(),
    setIsAutoConfirmEnabled: jest.fn(),
  }),
}));

let root: HTMLDivElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  setGlobal(cloneDeep(INITIAL_STATE));
  (enclave.authorize as jest.Mock).mockReset();
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

it('translates a rejected password and lets the user retry successfully', async () => {
  const onAuthorize = jest.fn();
  (enclave.authorize as jest.Mock).mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ token: 'passcode:test' });
  TeactDOM.render(
    <PasswordForm
      isActive
      operationType="unlock"
      submitLabel="Unlock"
      noAnimatedIcon
      noAutoConfirm
      onAuthorize={onAuthorize}
    />,
    root,
  );
  await waitForCondition(() => Boolean(root.querySelector('input[type="password"]')));
  const input = root.querySelector<HTMLInputElement>('input[type="password"]')!;
  await waitForCondition(() => document.activeElement === input);
  const submit = Array.from(root.querySelectorAll('button')).find((button) => button.textContent === 'Unlock')!;

  input.value = 'wrong';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await waitForCondition(() => !submit.disabled);
  submit.click();

  await waitForCondition(() => root.textContent!.includes('Неправильный пароль, попробуйте ещё раз.'));
  expect(root.textContent).not.toContain('Wrong password, please try again.');
  expect(onAuthorize).not.toHaveBeenCalled();

  input.value = 'correct';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await waitForCondition(() => !root.textContent!.includes('Неправильный пароль, попробуйте ещё раз.'));
  submit.click();
  await waitForCondition(() => onAuthorize.mock.calls.length === 1);
  expect(onAuthorize).toHaveBeenCalledWith('passcode:test');
});

it('translates an error supplied by the parent', async () => {
  TeactDOM.render(
    <PasswordForm
      isActive
      noAnimatedIcon
      noAutoConfirm
      error="Wrong password, please try again."
      onAuthorize={jest.fn()}
    />,
    root,
  );
  await waitForCondition(() => root.textContent!.includes('Неправильный пароль, попробуйте ещё раз.'));
  expect(root.textContent).not.toContain('Wrong password, please try again.');
});
