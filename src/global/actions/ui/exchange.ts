import { addActionHandler } from '../../index';
import { selectCurrentAccountState, selectIsBridgeAvailable } from '../../selectors';

addActionHandler('startExchange', (global, actions, payload) => {
  if (!selectIsBridgeAvailable(global)) return undefined;

  const tokenSlug = selectCurrentAccountState(global)?.currentTokenSlug;

  return {
    ...global,
    isExchangeModalOpen: true,
    exchangeSource: payload?.source ?? (tokenSlug?.startsWith('bnb-') ? 'bnb' : 'ton'),
    exchangeOperationId: payload?.bridgeOperationId,
  };
});

addActionHandler('closeExchange', (global) => ({
  ...global,
  isExchangeModalOpen: undefined,
  exchangeOperationId: undefined,
}));
