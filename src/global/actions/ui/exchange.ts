import { ENABLE_EXCHANGE } from '../../../config';
import { addActionHandler } from '../../index';

addActionHandler('startExchange', (global) => ENABLE_EXCHANGE ? ({
  ...global,
  isExchangeModalOpen: true,
}) : undefined);

addActionHandler('closeExchange', (global) => ({
  ...global,
  isExchangeModalOpen: undefined,
}));
