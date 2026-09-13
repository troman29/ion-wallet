import { getAccentColorIndexFromNft } from '../../../util/accentColor';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { updateAccountSettings, updateCurrentAccountSettings } from '../../reducers';
import { selectCurrentAccountId } from '../../selectors';

addActionHandler('setCardBackgroundNft', (global, actions, { nft, accountId }) => {
  global = updateAccountSettings(global, accountId ?? selectCurrentAccountId(global)!, { cardBackgroundNft: nft });
  setGlobal(global);
});

addActionHandler('clearCardBackgroundNft', (global) => {
  global = updateCurrentAccountSettings(global, { cardBackgroundNft: undefined });
  setGlobal(global);
});

addActionHandler('installAccentColorFromNft', async (global, actions, { nft, accountId }) => {
  const accentColorIndex = await getAccentColorIndexFromNft(nft);

  global = getGlobal();
  global = updateAccountSettings(
    global,
    accountId ?? selectCurrentAccountId(global)!,
    { accentColorNft: nft, accentColorIndex },
  );
  setGlobal(global);
});

addActionHandler('clearAccentColorFromNft', (global) => {
  return updateCurrentAccountSettings(global, {
    accentColorNft: undefined,
    accentColorIndex: undefined,
  });
});
