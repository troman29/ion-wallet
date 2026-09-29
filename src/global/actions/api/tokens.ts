import { callApi } from '../../../api';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { updateTokenPriceHistory } from '../../reducers/tokens';

addActionHandler('loadPriceHistory', async (global, actions, payload) => {
  const { slug, period, currency = global.settings.baseCurrency } = payload ?? {};
  const { baseCurrency } = global.settings;

  const history = await callApi('fetchPriceHistory', slug, period, currency);

  if (!history) {
    return;
  }

  global = getGlobal();
  // The history is not stored per currency, and the chart asks for a new series on every currency
  // change, so a result awaited across such a change belongs to no longer shown prices
  if (global.settings.baseCurrency !== baseCurrency) {
    return;
  }

  global = updateTokenPriceHistory(global, slug, { [period]: history });
  setGlobal(global);
});
