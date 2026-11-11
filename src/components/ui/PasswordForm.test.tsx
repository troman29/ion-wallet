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
let mockBackgroundGeneration = 0;
let mockIsBackground = false;
jest.mock('../../util/capacitor/appLifecycle', () => ({
  getAppBackgroundGeneration: () => mockBackgroundGeneration,
  getIsAppInBackground: () => mockIsBackground,
}));

beforeEach(() => {
  mockBackgroundGeneration = 0;
  mockIsBackground = false;
  root = document.createElement('div');
  document.body.append(root);
  setGlobal(cloneDeep(INITIAL_STATE));
  (enclave.authorize as jest.Mock).mockReset();
});

it('rejects biometric authorization that spans a background transition', async () => {
  const onAuthorize = jest.fn();
  let resolveAuth!: (value: { token: string }) => void;
  (enclave.authorize as jest.Mock).mockImplementation(() => new Promise((resolve) => {
    resolveAuth = resolve;
  }));
  setGlobal({ ...cloneDeep(INITIAL_STATE), authTypes: ['biometric'] });
  TeactDOM.render(
    <PasswordForm isActive operationType="unlock" noAnimatedIcon noAutoConfirm onAuthorize={onAuthorize} />,
    root,
  );
  await waitForCondition(() => (enclave.authorize as jest.Mock).mock.calls.length === 1);
  mockBackgroundGeneration++;
  resolveAuth({ token: 'biometric:stale' });
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  expect(onAuthorize).not.toHaveBeenCalled();
});

it('does not launch a delayed biometric prompt after the app enters background', async () => {
  setGlobal({ ...cloneDeep(INITIAL_STATE), authTypes: ['biometric'] });
  TeactDOM.render(
    <PasswordForm isActive operationType="unlock" noAnimatedIcon noAutoConfirm onAuthorize={jest.fn()} />,
    root,
  );
  mockIsBackground = true;
  await new Promise((resolve) => {
    setTimeout(resolve, 400);
  });
  expect(enclave.authorize).not.toHaveBeenCalled();
});

it.each(['success', 'failure', 'error'])('retries an outdated biometric %s after returning', async (result) => {
  const onAuthorize = jest.fn();
  let finishOldRequest!: (value?: { token: string }) => void;
  let rejectOldRequest!: (error: Error) => void;
  (enclave.authorize as jest.Mock)
    .mockImplementationOnce(() => new Promise((resolve, reject) => {
      finishOldRequest = resolve;
      rejectOldRequest = reject;
    }))
    .mockResolvedValueOnce({ token: 'biometric:current' });
  setGlobal({ ...cloneDeep(INITIAL_STATE), authTypes: ['biometric'] });
  const render = (isActive: boolean) => TeactDOM.render(
    <PasswordForm isActive={isActive} operationType="unlock" noAnimatedIcon noAutoConfirm onAuthorize={onAuthorize} />,
    root,
  );
  render(true);
  await waitForCondition(() => (enclave.authorize as jest.Mock).mock.calls.length === 1);
  mockIsBackground = true;
  mockBackgroundGeneration++;
  render(false);
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  mockIsBackground = false;
  render(true);
  await new Promise((resolve) => {
    setTimeout(resolve, 400);
  });
  expect(enclave.authorize).toHaveBeenCalledTimes(1);
  if (result === 'error') {
    rejectOldRequest(new Error('Cancelled in background'));
  } else {
    finishOldRequest(result === 'success' ? { token: 'biometric:stale' } : undefined);
  }
  await waitForCondition(() => onAuthorize.mock.calls.length === 1);
  expect(enclave.authorize).toHaveBeenCalledTimes(2);
  expect(onAuthorize).toHaveBeenCalledWith('biometric:current');
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
