import { addActionHandler } from '../../index';

addActionHandler('startExchange', (global) => ({
  ...global,
  isExchangeModalOpen: true,
}));

addActionHandler('closeExchange', (global) => ({
  ...global,
  isExchangeModalOpen: undefined,
}));
