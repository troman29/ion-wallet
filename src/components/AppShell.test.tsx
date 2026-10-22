import React from '../lib/teact/teact';
import TeactDOM from '../lib/teact/teact-dom';
import { getGlobal, setGlobal } from '../global';

import { ElectronEvent } from '../electron/types';

import { APP_DOWNLOAD_URLS } from '../config';
import { INITIAL_STATE } from '../global/initialState';
import { cloneDeep } from '../util/iteratees';
import { pause } from '../util/schedulers';

import AppShell from './AppShell';

jest.mock('../util/windowEnvironment', () => ({
  ...jest.requireActual('../util/windowEnvironment'),
  IS_ELECTRON: true,
  IS_WEB: false,
  IS_WINDOWS: true,
  IS_MAC_OS: false,
}));

let root: HTMLDivElement;
let portals: HTMLDivElement;
let autoUpdateEnabled: boolean;
const listeners = new Map<ElectronEvent, NoneToVoidFunction>();
const installUpdate = jest.fn().mockResolvedValue(undefined);
const closeWindow = jest.fn();
const subscribe = jest.fn((event: ElectronEvent, listener: NoneToVoidFunction) => {
  listeners.set(event, listener);
  return () => listeners.delete(event);
});
const originalElectron = Object.getOwnPropertyDescriptor(window, 'electron');

beforeEach(() => {
  root = document.createElement('div');
  portals = document.createElement('div');
  portals.id = 'portals';
  document.body.append(root, portals);
  listeners.clear();
  subscribe.mockClear();
  installUpdate.mockClear();
  closeWindow.mockClear();
  autoUpdateEnabled = true;
  Object.defineProperty(window, 'electron', {
    configurable: true,
    value: {
      on: subscribe,
      installUpdate,
      close: closeWindow,
      getIsAutoUpdateEnabled: () => Promise.resolve(autoUpdateEnabled),
    },
  });
  setGlobal(cloneDeep(INITIAL_STATE));
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
  portals.remove();
  delete APP_DOWNLOAD_URLS.desktop;
  if (originalElectron) Object.defineProperty(window, 'electron', originalElectron);
  else Reflect.deleteProperty(window, 'electron');
  jest.restoreAllMocks();
});

async function renderShell(required: boolean) {
  setGlobal({ ...cloneDeep(INITIAL_STATE), isAppUpdateRequired: required });
  TeactDOM.render(
    <AppShell isUpdateRequired={required}><button type="button">Wallet action</button></AppShell>,
    root,
  );
  await pause(50);
}

it.each([true, false])('installs a native update downloaded before the required screen: %s', async (beforeRequired) => {
  await renderShell(false);
  const header = root.firstElementChild;
  if (beforeRequired) {
    listeners.get(ElectronEvent.UPDATE_DOWNLOADED)!();
    await pause(50);
  }
  await renderShell(true);
  if (!beforeRequired) {
    listeners.get(ElectronEvent.UPDATE_DOWNLOADED)!();
    await pause(50);
  }
  expect(root.firstElementChild).toBe(header);
  expect(root.textContent).not.toContain('Wallet action');
  expect(subscribe).toHaveBeenCalledTimes(2);
  expect(portals.textContent).not.toContain('download channel is currently unavailable');
  portals.querySelector<HTMLButtonElement>('button')!.click();
  await pause(50);
  expect(installUpdate).toHaveBeenCalledTimes(1);
});

it('keeps wallet actions blocked when no native or manual update channel exists', async () => {
  autoUpdateEnabled = false;
  await renderShell(true);
  // The main process also emits this notification for a manual update; it does not imply a downloaded installer.
  listeners.get(ElectronEvent.UPDATE_DOWNLOADED)!();
  await pause(50);
  expect(root.textContent).not.toContain('Wallet action');
  expect(portals.textContent).toContain('download channel is currently unavailable');
  expect(portals.querySelector('button')).toBeNull();
  expect(installUpdate).not.toHaveBeenCalled();
  expect(document.documentElement.classList.contains('is-modal-open')).toBe(false);
  root.querySelector<HTMLElement>('.icon-windows-close')!.parentElement!.click();
  expect(closeWindow).toHaveBeenCalledTimes(1);
});

it('shows the unavailable channel message on a native updater error', async () => {
  await renderShell(true);
  listeners.get(ElectronEvent.UPDATE_ERROR)!();
  await pause(50);
  expect(portals.textContent).toContain('download channel is currently unavailable');
  expect(portals.querySelector('button')).toBeNull();
  expect(root.textContent).not.toContain('Wallet action');
});

it('opens the approved manual channel while a native installer has not downloaded', async () => {
  APP_DOWNLOAD_URLS.desktop = 'https://example.org/approved-desktop';
  const open = jest.spyOn(window, 'open').mockImplementation(() => window);
  await renderShell(true);
  portals.querySelector<HTMLButtonElement>('button')!.click();
  await pause(50);
  expect(open).toHaveBeenCalledWith(APP_DOWNLOAD_URLS.desktop, '_blank', 'noopener');
  expect(installUpdate).not.toHaveBeenCalled();
});

it.each([true, false])('reloads a remote renderer available before the required screen: %s', async (beforeRequired) => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => window);
  // JSDOM reports attempted reloads through console.error because navigation is not implemented.
  const navigationError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  await renderShell(false);
  if (beforeRequired) {
    setGlobal({ ...getGlobal(), isAppUpdateAvailable: true });
    await pause(50);
  }
  setGlobal({ ...getGlobal(), isAppUpdateRequired: true });
  TeactDOM.render(<AppShell isUpdateRequired><button type="button">Wallet action</button></AppShell>, root);
  await pause(50);
  if (!beforeRequired) {
    setGlobal({ ...getGlobal(), isAppUpdateAvailable: true });
    await pause(50);
  }
  // A broken native feed must not prevent a working renderer refresh.
  listeners.get(ElectronEvent.UPDATE_ERROR)!();
  await pause(50);
  expect(root.textContent).not.toContain('Wallet action');
  expect(portals.textContent).not.toContain('download channel is currently unavailable');
  portals.querySelector<HTMLButtonElement>('button')!.click();
  await pause(50);
  expect(navigationError).toHaveBeenCalledWith(expect.objectContaining({
    message: expect.stringContaining('Not implemented: navigation'),
  }));
  expect(installUpdate).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});

it('does not reload a bundled renderer when native auto update is disabled', async () => {
  autoUpdateEnabled = false;
  await renderShell(true);
  setGlobal({ ...getGlobal(), isAppUpdateAvailable: true });
  await pause(50);
  expect(portals.querySelector('button')).toBeNull();
  expect(portals.textContent).toContain('download channel is currently unavailable');
  expect(root.textContent).not.toContain('Wallet action');
});

it('prefers a downloaded native installer over a renderer refresh', async () => {
  await renderShell(true);
  setGlobal({ ...getGlobal(), isAppUpdateAvailable: true });
  listeners.get(ElectronEvent.UPDATE_DOWNLOADED)!();
  await pause(50);
  portals.querySelector<HTMLButtonElement>('button')!.click();
  await pause(50);
  expect(installUpdate).toHaveBeenCalledTimes(1);
});
