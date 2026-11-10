import React from '../../../lib/teact/teact';
import TeactDOM from '../../../lib/teact/teact-dom';
import * as global from '../../../global';

import type { TokenDetailsState } from '../../../global/types';

import { INITIAL_STATE } from '../../../global/initialState';
import { cloneDeep } from '../../../util/iteratees';
import { pause } from '../../../util/schedulers';

import Info from './Info';

let root: HTMLDivElement;
const loadTokenDetails = jest.fn();

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  loadTokenDetails.mockClear();
  jest.spyOn(global, 'getActions').mockReturnValue({ ...global.getActions(), loadTokenDetails });
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
  jest.restoreAllMocks();
});

async function renderInfo(details: TokenDetailsState, isActive = false, areSettingsOpen = false) {
  const state = cloneDeep(INITIAL_STATE);
  state.settings.langCode = 'en';
  state.settings.baseCurrency = 'EUR';
  state.areSettingsOpen = areSettingsOpen;
  state.currencyRates.EUR = '2';
  state.tokenDetails.bySlug.ioncoin = { langCode: 'en', ...details };
  global.setGlobal(state);
  TeactDOM.render(<Info tokenSlug="ioncoin" isActive={isActive} />, root);
  await pause(50);
}

it('converts USD metrics to the selected currency and shows total volume without a trading split', async () => {
  await renderInfo({ data: { description: 'ION description', marketCap: 100, volume24h: { total: 20 } } });
  expect(root.textContent).toContain('ION description');
  expect(root.textContent).toContain('€200');
  expect(root.textContent).toContain('€40');
  expect(root.textContent).toContain('Volume');
  expect(loadTokenDetails).not.toHaveBeenCalled();
});

it('shows LION supply without adding absent ION metrics', async () => {
  await renderInfo({ data: { description: 'Liquid ION', totalSupply: 0 } });
  expect(root.textContent).toContain('Total Supply');
  expect(root.textContent).toContain('0');
  expect(root.textContent).not.toContain('Market Cap');
  expect(root.textContent).not.toContain('Volume');
});

it('keeps visible details during an unsuccessful refresh', async () => {
  await renderInfo({ data: { description: 'Cached ION description' }, hasError: true });
  expect(root.textContent).toContain('Cached ION description');
  expect(root.querySelector('button')).toBeNull();
});

it('refreshes the selected token when the panel opens', async () => {
  await renderInfo({ data: { description: 'ION' } }, true);
  expect(loadTokenDetails).toHaveBeenCalledWith({ slugs: ['ioncoin'] });
});

it('does not refresh a token panel covered by the settings screen', async () => {
  await renderInfo({ data: { description: 'ION' } }, true, true);
  expect(loadTokenDetails).not.toHaveBeenCalled();
});

it('offers an explicit retry after an unsuccessful first request', async () => {
  await renderInfo({ hasError: true });
  expect(root.textContent).toContain('No Data');
  root.querySelector<HTMLButtonElement>('button')!.click();
  expect(loadTokenDetails).toHaveBeenCalledWith({ slugs: ['ioncoin'] });
});

it('renders the labels and destinations of additional social links', async () => {
  await renderInfo({ data: { links: [
    { kind: 'facebook', url: 'https://www.facebook.com/ice.blockchain' },
    { kind: 'instagram', url: 'https://www.instagram.com/ice.blockchain' },
    { kind: 'linkedin', url: 'https://www.linkedin.com/company/ice-blockchain' },
    { kind: 'tiktok', url: 'https://www.tiktok.com/@ice.blockchain' },
    { kind: 'youtube', url: 'https://www.youtube.com/@ice.blockchain' },
    { kind: 'reddit', url: 'https://www.reddit.com/r/iceblockchain' },
  ] } });
  expect([...root.querySelectorAll('a')].map((link) => link.textContent)).toEqual([
    'Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Reddit',
  ]);
  expect(root.querySelectorAll('a')).toHaveLength(6);
});
