import React from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';

import { waitForCondition } from '../../../tests/util/async';

import DropdownItemContent from './DropdownItemContent';

jest.mock('../../hooks/useLang', () => ({
  __esModule: true,
  default: () => (key: string) => key,
}));

let root: HTMLDivElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

it('keeps the network visible when the token has no image', async () => {
  TeactDOM.render(
    <DropdownItemContent item={{ value: 'ion-bep20', name: 'ION', overlayIcon: 'bnb.svg' }} />,
    root,
  );

  await waitForCondition(() => Boolean(root.querySelector('img')));
  expect(root.querySelectorAll('img')).toHaveLength(1);
  expect(root.querySelector('img')!.getAttribute('src')).toBe('bnb.svg');
  expect(root.textContent).toBe('ION');
});

it('shows both the token image and its network badge when available', async () => {
  TeactDOM.render(
    <DropdownItemContent item={{ value: 'ion-bep20', name: 'ION', icon: 'ion.svg', overlayIcon: 'bnb.svg' }} />,
    root,
  );

  await waitForCondition(() => root.querySelectorAll('img').length === 2);
  expect(Array.from(root.querySelectorAll('img'), (image) => image.getAttribute('src')))
    .toEqual(['ion.svg', 'bnb.svg']);
});

it('preserves custom icon content', async () => {
  TeactDOM.render(
    <DropdownItemContent item={{ value: 'custom', name: 'Custom', icon: <span data-custom-icon>Icon</span> }} />,
    root,
  );

  await waitForCondition(() => Boolean(root.querySelector('[data-custom-icon]')));
  expect(root.querySelector('img')).toBeNull();
});
