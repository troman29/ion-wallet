import React from '../../../../lib/teact/teact';
import TeactDOM from '../../../../lib/teact/teact-dom';
import * as global from '../../../../global';

import type { ApiChain } from '../../../../api/types';

import { INITIAL_STATE } from '../../../../global/initialState';
import { cloneDeep } from '../../../../util/iteratees';
import { pause } from '../../../../util/schedulers';

import CardAddress from './CardAddress';

jest.mock('../../../../config', () => ({ ...jest.requireActual('../../../../config'), IS_CAPACITOR: true }));
jest.mock('@capacitor/app-launcher', () => ({
  AppLauncher: { openUrl: jest.fn().mockResolvedValue({ completed: false }) },
}));
jest.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: jest.fn().mockResolvedValue({ remove: jest.fn() }) },
}));
jest.mock('../../../../global/helpers/misc', () => ({
  ...jest.requireActual('../../../../global/helpers/misc'), closeAllOverlays: jest.fn().mockResolvedValue(undefined),
}));

let root: HTMLDivElement;
let portals: HTMLDivElement;
const openBrowser = jest.fn();

beforeEach(() => {
  root = document.createElement('div');
  portals = document.createElement('div');
  portals.id = 'portals';
  document.body.append(root, portals);
  openBrowser.mockClear();
  const actions = global.getActions();
  jest.spyOn(global, 'getActions').mockReturnValue({ ...actions, openBrowser });
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
  portals.remove();
  jest.restoreAllMocks();
});

it.each([
  ['bnb', '0x0000000000000000000000000000000000000001', 'https://bscscan.com/address/'],
  ['ton', 'EQAYI9vwZ3K5y9n_9-E8F_e3JzMzNNyEib0ddBlfAWOOsh_c', 'https://explorer.ice.io/address/'],
] as const)('opens %s from the card menu in its configured browser', async (chain, address, base) => {
  const state = cloneDeep(INITIAL_STATE);
  state.currentAccountId = '0-mainnet';
  state.accounts = { byId: {
    '0-mainnet': { title: 'Test', type: 'view', byChain: { [chain as ApiChain]: { address } } },
  } };
  state.byAccountId = { '0-mainnet': {} };
  global.setGlobal(state);
  const open = jest.spyOn(window, 'open').mockImplementation(() => window);
  TeactDOM.render(<CardAddress />, root);
  await pause(50);
  root.querySelector<HTMLButtonElement>('button')!.click();
  await pause(50);
  portals.querySelector<HTMLElement>('.icon-explorer-small[role="button"]')!.click();
  await pause(50);
  if (chain === 'bnb') {
    expect(openBrowser).toHaveBeenCalledWith(expect.objectContaining({ url: base + address }));
    expect(open).not.toHaveBeenCalled();
  } else {
    expect(open).toHaveBeenCalledWith(base + address, '_blank', 'noopener');
    expect(openBrowser).not.toHaveBeenCalled();
  }
});
