import type { ApiActivity, ApiChain } from '../../../api/types';
import type { GlobalState } from '../../types';

import { getIsHiddenNftActivity } from '../../../util/activities';
import { playIncomingTransactionSound } from '../../../util/notificationSound';
import { getIsTransactionWithPoisoning, updatePoisoningCacheFromActivities } from '../../../util/poisoningHash';
import { waitFor } from '../../../util/schedulers';
import { getChainBySlug } from '../../../util/tokens';
import { SEC } from '../../../api/constants';
import { getIsTinyOrScamTransaction } from '../../helpers';
import { runActivityUpdateInOrder } from '../../helpers/activityUpdateQueue';
import { addActionHandler, getActions, getGlobal, setGlobal } from '../../index';
import {
  addInitialActivities,
  addNewActivities,
  applyIncomingNftFromActivity,
  applyOutgoingNftFromActivity,
  replacePendingActivities,
} from '../../reducers';
import {
  selectAccountState,
  selectAccountTokens,
} from '../../selectors';

const TX_AGE_TO_PLAY_SOUND = 60000; // 1 min
const PRELOAD_ACTIVITY_TOKEN_COUNT = 10;

addActionHandler('apiUpdate', async (global, actions, update) => {
  switch (update.type) {
    case 'initialActivities': {
      const {
        accountId, mainActivities, mainHistoryHasMore, bySlug, chain,
      } = update;

      updatePoisoningCacheFromActivities(mainActivities);

      global = getGlobal();
      global = addInitialActivities(global, accountId, mainActivities, bySlug, chain, mainHistoryHasMore);
      setGlobal(global);

      void preloadTopTokenHistory(accountId, chain);
      break;
    }

    case 'newLocalActivities': {
      const { accountId, activities } = update;
      await runActivityUpdateInOrder(accountId, async () => {
        await Promise.resolve();
        setGlobal(addNewActivities(getGlobal(), accountId, activities));
      });
      break;
    }

    case 'newActivities': {
      const { accountId, activities: confirmedActivities, pendingActivities, chain } = update;
      await runActivityUpdateInOrder(accountId, async () => {
        await Promise.resolve();
        let nextGlobal = getGlobal();
        if (chain && pendingActivities) {
          nextGlobal = replacePendingActivities(nextGlobal, accountId, chain, pendingActivities);
        }
        nextGlobal = addNewActivities(nextGlobal, accountId, confirmedActivities);
        notifyAboutNewActivities(
          nextGlobal, accountId, confirmedActivities.filter(({ shouldHide }) => shouldHide !== true),
        );
        updatePoisoningCacheFromActivities(confirmedActivities);
        for (const activity of confirmedActivities) {
          if (!activity.nft) continue;
          nextGlobal = activity.isIncoming
            ? applyIncomingNftFromActivity(nextGlobal, accountId, activity.nft)
            : applyOutgoingNftFromActivity(nextGlobal, accountId, activity.nft);
        }
        setGlobal(nextGlobal);
      });
      break;
    }
  }
});

function notifyAboutNewActivities(global: GlobalState, accountId: string, newActivities: ApiActivity[]) {
  if (!global.settings.canPlaySounds) {
    return;
  }

  const { areTinyTransfersHidden, areUnverifiedNftsHidden } = global.settings;
  const { blacklistedNftAddresses, whitelistedNftAddresses } = selectAccountState(global, accountId) || {};

  const shouldPlaySound = newActivities.some((activity) => {
    return activity.kind === 'transaction'
      && activity.isIncoming
      && activity.status === 'completed'
      && (Date.now() - activity.timestamp < TX_AGE_TO_PLAY_SOUND)
      && !getIsHiddenNftActivity(activity, blacklistedNftAddresses, whitelistedNftAddresses, areUnverifiedNftsHidden)
      && !(areTinyTransfersHidden && getIsTinyOrScamTransaction(activity, global.tokenInfo?.bySlug[activity.slug]))
      && !getIsTransactionWithPoisoning(activity);
  });

  if (shouldPlaySound) {
    playIncomingTransactionSound();
  }
}

async function preloadTopTokenHistory(accountId: string, chain: ApiChain) {
  const { fetchPastActivities } = getActions();

  await waitFor(() => !!selectAccountTokens(getGlobal(), accountId), SEC, 10);
  const global = getGlobal();

  const tokens = (selectAccountTokens(global, accountId) ?? [])
    .slice(0, PRELOAD_ACTIVITY_TOKEN_COUNT)
    .filter((token) => getChainBySlug(token.slug) === chain);

  const { idsBySlug } = selectAccountState(global, accountId)?.activities || {};

  for (const { slug } of tokens) {
    if (idsBySlug?.[slug] === undefined) {
      fetchPastActivities({ accountId, slug });
    }
  }
}
