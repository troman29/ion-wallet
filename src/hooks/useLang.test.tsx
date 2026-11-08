import React from '../lib/teact/teact';
import TeactDOM from '../lib/teact/teact-dom';

import { pause } from '../util/schedulers';
import useLang from './useLang';

const mockLang = {
  getTranslation: ((key: string) => key) as (key: string) => string,
};

jest.mock('../util/langProvider', () => ({
  get getTranslation() {
    return mockLang.getTranslation;
  },
  addCallback: () => () => undefined,
}));

function Label() {
  const lang = useLang();
  return <span>{lang('Fund')}</span>;
}

// Teact runs effects and re-renders after the frame
const flushUpdates = () => pause(50);

describe('useLang', () => {
  it('shows the language pack that loads between the first render and the subscription', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    TeactDOM.render(<Label />, root);
    // The pack arrives before the effect subscribes, so its callback never reaches the component
    mockLang.getTranslation = (key: string) => (key === 'Fund' ? 'Пополнить' : key);
    await flushUpdates();

    expect(root.textContent).toBe('Пополнить');

    TeactDOM.render(undefined, root);
    root.remove();
  });
});
