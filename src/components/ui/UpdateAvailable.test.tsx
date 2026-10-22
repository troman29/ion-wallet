import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import { setGlobal } from '../../global';

import { INITIAL_STATE } from '../../global/initialState';
import { cloneDeep } from '../../util/iteratees';
import { pause } from '../../util/schedulers';

import UpdateAvailable from './UpdateAvailable';

jest.mock('../../util/windowEnvironment', () => ({
  ...jest.requireActual('../../util/windowEnvironment'),
  IS_WEB: false,
}));

let root: HTMLDivElement;
let portals: HTMLDivElement;

beforeEach(() => {
  root = document.createElement('div');
  portals = document.createElement('div');
  portals.id = 'portals';
  document.body.append(root, portals);
  setGlobal(cloneDeep(INITIAL_STATE));
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
  portals.remove();
});

it('keeps the required update screen without an installer URL or dismiss action', async () => {
  setGlobal({ ...cloneDeep(INITIAL_STATE), isAppUpdateRequired: true });
  TeactDOM.render(<UpdateAvailable />, root);
  await pause(100);
  expect(portals.textContent).toContain('download channel is currently unavailable');
  expect(portals.querySelector('a')).toBeNull();
  expect(portals.querySelector('button')).toBeNull();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  await pause(50);
  expect(portals.textContent).toContain('download channel is currently unavailable');
});

it('does not offer an optional update without an installer URL', async () => {
  setGlobal({ ...cloneDeep(INITIAL_STATE), isAppUpdateAvailable: true });
  TeactDOM.render(<UpdateAvailable />, root);
  await pause(50);
  expect(root.textContent).toBe('');
  expect(portals.textContent).toBe('');
});
