import type { FC } from '../../../lib/teact/teact';
import React from '../../../lib/teact/teact';
import TeactDOM from '../../../lib/teact/teact-dom';

import type { UserToken } from '../../../global/types';
import type { TokenPricePoint } from './Chart';

import { IONCOIN } from '../../../config';
import { pause } from '../../../util/schedulers';

import Chart from './Chart';

jest.mock('../../../global', () => ({
  setGlobal: jest.fn(),
  getActions: () => ({ loadPriceHistory: jest.fn(), setCurrentTokenPeriod: jest.fn() }),
  withGlobal: () => (component: FC) => component,
}));
jest.mock('../../../hooks/useLang', () => () => Object.assign((key: string) => key, { code: 'en' }));
jest.mock('../../common/TimeRangeSelector', () => () => undefined);
jest.mock('../../ui/Transition', () => ({ children }: { children: unknown }) => children);
jest.mock('./Plot', () => {
  const React = jest.requireActual('../../../lib/teact/teact').default;
  return ({ onSelectIndex }: { onSelectIndex: (index: number) => void }) => (
    <div>
      <button id="select-point" onClick={() => onSelectIndex(0)}>Select</button>
      <button id="clear-point" onClick={() => onSelectIndex(-1)}>Clear</button>
    </div>
  );
});

const TestChart = Chart as FC<Parameters<typeof Chart>[0] & {
  period: '1Y';
  baseCurrency: 'USD' | 'TON';
  historyPeriods: { '1Y': [number, number][] };
}>;
const TOKEN: UserToken = {
  ...IONCOIN, amount: 1_000_000_000n, price: 9, priceUsd: 9, change24h: 0, totalValue: '9', isDisabled: false,
};
const HISTORY: { '1Y': [number, number][] } = { '1Y': [[1000, 2], [2000, 3]] };
let root: HTMLDivElement;
let onPricePointChange: jest.Mock<void, [TokenPricePoint?]>;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  onPricePointChange = jest.fn();
});
afterEach(() => {
  TeactDOM.render(undefined, root);
  root.remove();
});

it('leaves the current balance on the live feed until a historical point is explicitly selected', async () => {
  TeactDOM.render(
    <TestChart
      token={TOKEN}
      period="1Y"
      baseCurrency="USD"
      historyPeriods={HISTORY}
      onPricePointChange={onPricePointChange}
    />, root);
  await pause(50);
  expect(onPricePointChange).toHaveBeenLastCalledWith(undefined);
  root.querySelector<HTMLButtonElement>('#select-point')!.click();
  await pause(50);
  expect(onPricePointChange).toHaveBeenLastCalledWith({ price: 2, initialPrice: 2 });
  root.querySelector<HTMLButtonElement>('#clear-point')!.click();
  await pause(50);
  expect(onPricePointChange).toHaveBeenLastCalledWith(undefined);
});

it('does not override an ION-denominated balance with the USD fallback chart even on selection', async () => {
  TeactDOM.render(
    <TestChart
      token={TOKEN}
      period="1Y"
      baseCurrency="TON"
      historyPeriods={HISTORY}
      onPricePointChange={onPricePointChange}
    />, root);
  await pause(50);
  root.querySelector<HTMLButtonElement>('#select-point')!.click();
  await pause(50);
  expect(onPricePointChange.mock.calls.every(([point]) => point === undefined)).toBe(true);
});
