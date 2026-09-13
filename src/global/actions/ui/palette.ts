import { addActionHandler } from '../../index';
import { updateCurrentAccountSettings } from '../../reducers';

addActionHandler('setAccentColorIndex', (global, actions, { accentColorIndex }) => {
  return updateCurrentAccountSettings(global, { accentColorIndex });
});
