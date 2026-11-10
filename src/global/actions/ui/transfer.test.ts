import './transfer';

import type { GlobalState } from '../../types';

import { STAKED_ION_SLUG } from '../../../config';
import { addActionHandler, setGlobal } from '../../index';
import { INITIAL_STATE } from '../../initialState';

jest.mock('../../index', () => ({ addActionHandler: jest.fn(), setGlobal: jest.fn() }));
jest.mock('../../selectors', () => ({
  selectEnclaveToken: jest.fn(),
  selectIsEnclaveSessionValid: jest.fn(),
}));
jest.mock('../../reducers', () => ({
  updateCurrentTransfer: (global: GlobalState, update: AnyLiteral) => ({
    ...global, currentTransfer: { ...global.currentTransfer, ...update },
  }),
  setCurrentTransferAddress: jest.fn(),
}));

const handlers = Object.fromEntries((addActionHandler as jest.Mock).mock.calls) as Record<
  string, (global: GlobalState, actions: AnyLiteral, payload?: AnyLiteral) => void
>;

beforeEach(() => {
  jest.clearAllMocks();
});

it('opens a LION transfer from a deep link', () => {
  const actions = { showError: jest.fn() };
  handlers.startTransfer(INITIAL_STATE, actions, { tokenSlug: STAKED_ION_SLUG, amount: 10n });
  expect(actions.showError).not.toHaveBeenCalled();
  expect(setGlobal).toHaveBeenCalledWith(expect.objectContaining({
    currentTransfer: expect.objectContaining({ tokenSlug: STAKED_ION_SLUG, amount: 10n }),
  }));
});

it('allows selecting LION in the transfer form', () => {
  handlers.changeTransferToken(INITIAL_STATE, {}, { tokenSlug: STAKED_ION_SLUG, withResetAmount: true });
  expect(setGlobal).toHaveBeenCalledWith(expect.objectContaining({
    currentTransfer: expect.objectContaining({ tokenSlug: STAKED_ION_SLUG, amount: undefined }),
  }));
});
