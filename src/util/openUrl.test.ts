import * as global from '../global';

import { openUrl } from './openUrl';

jest.mock('../config', () => ({ ...jest.requireActual('../config'), IS_CAPACITOR: true }));
jest.mock('@capacitor/app-launcher', () => ({
  AppLauncher: { openUrl: jest.fn().mockResolvedValue({ completed: false }) },
}));
jest.mock('../global/helpers/misc', () => ({
  ...jest.requireActual('../global/helpers/misc'), closeAllOverlays: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  const actions = global.getActions();
  jest.spyOn(global, 'getActions').mockReturnValue({ ...actions, openBrowser: jest.fn() });
});

afterEach(() => jest.restoreAllMocks());

it('opens ION Explorer externally on Capacitor even when an embedded open is requested', async () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => window);
  const url = 'https://explorer.ice.io/address/public-fixture';
  await openUrl(url, { isExternal: false });
  expect(open).toHaveBeenCalledWith(url, '_blank', 'noopener');
  expect(global.getActions().openBrowser).not.toHaveBeenCalled();
});

it('preserves the configured BNB open behavior on Capacitor', async () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => window);
  await openUrl('https://bscscan.com/address/public-fixture');
  expect(global.getActions().openBrowser).toHaveBeenCalledWith(expect.objectContaining({
    url: 'https://bscscan.com/address/public-fixture',
  }));
  expect(open).not.toHaveBeenCalled();
});
